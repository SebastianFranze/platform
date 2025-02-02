<?php declare(strict_types=1);

namespace Shopware\Core\Framework\DataAbstractionLayer\Dbal;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\Dbal\Exception\InvalidSortingDirectionException;
use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\AssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\AntiJoinFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\Filter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\MultiFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\NotFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Parser\SqlQueryParser;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Query\ScoreQuery;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Term\EntityScoreQueryBuilder;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Term\SearchTermInterpreter;
use Shopware\Core\Framework\Uuid\Uuid;

trait CriteriaQueryHelper
{
    abstract protected function getParser(): SqlQueryParser;

    abstract protected function getDefinitionHelper(): EntityDefinitionQueryHelper;

    abstract protected function getInterpreter(): SearchTermInterpreter;

    abstract protected function getScoreBuilder(): EntityScoreQueryBuilder;

    protected function buildQueryByCriteria(QueryBuilder $query, EntityDefinition $definition, Criteria $criteria, Context $context): QueryBuilder
    {
        $table = $definition->getEntityName();

        $query = $this->getDefinitionHelper()->getBaseQuery($query, $definition, $context);

        if ($definition->isInheritanceAware() && $context->considerInheritance()) {
            $parent = $definition->getFields()->get('parent');
            $this->getDefinitionHelper()->resolveField($parent, $definition, $definition->getEntityName(), $query, $context);
        }

        if ($criteria->getTerm()) {
            $pattern = $this->getInterpreter()->interpret($criteria->getTerm());
            $queries = $this->getScoreBuilder()->buildScoreQueries($pattern, $definition, $definition->getEntityName(), $context);
            $criteria->addQuery(...$queries);
        }

        $filter = $this->antiJoinTransform($definition,
            new MultiFilter('AND',
                array_merge(
                    $criteria->getFilters(),
                    $criteria->getPostFilters()
                )
            )
        );

        $criteria->resetFilters();
        if ($filter) {
            $criteria->addFilter($filter);
        }

        $fields = $this->getFieldsByCriteria($criteria);
        //join association and translated fields
        foreach ($fields as $fieldName) {
            if ($fieldName === '_score') {
                continue;
            }

            $this->getDefinitionHelper()->resolveAccessor($fieldName, $definition, $table, $query, $context);
        }

        $antiJoins = $this->groupAntiJoinConditions($query, $filter, $definition, $context);
        // handle anti-join
        foreach ($antiJoins as $fieldName => $antiJoinConditions) {
            if ($fieldName === '_score') {
                continue;
            }

            $this->getDefinitionHelper()->resolveAntiJoinAccessors($fieldName, $definition, $table, $query, $context, $antiJoinConditions);
        }

        $this->addFilter($definition, $filter, $query, $context);

        $this->addQueries($definition, $criteria, $query, $context);

        $this->addSortings($definition, $criteria->getSorting(), $query, $context);

        return $query;
    }

    protected function addIdCondition(Criteria $criteria, EntityDefinition $definition, QueryBuilder $query): void
    {
        $primaryKey = $criteria->getIds();

        $primaryKey = array_values($primaryKey);

        if (!\is_array($primaryKey[0]) || \count($primaryKey[0]) === 1) {
            $bytes = array_map(function (string $id) {
                return Uuid::fromHexToBytes($id);
            }, $criteria->getIds());

            $query->andWhere(EntityDefinitionQueryHelper::escape($definition->getEntityName()) . '.`id` IN (:ids)');

            $query->setParameter('ids', array_values($bytes), Connection::PARAM_STR_ARRAY);

            return;
        }

        $this->addIdConditionWithOr($criteria, $definition, $query);
    }

    protected function addFilter(EntityDefinition $definition, ?Filter $filter, QueryBuilder $query, Context $context): void
    {
        if (!$filter) {
            return;
        }

        $parsed = $this->getParser()->parse($filter, $definition, $context);

        if (empty($parsed->getWheres())) {
            return;
        }

        $query->andWhere(implode(' AND ', $parsed->getWheres()));
        foreach ($parsed->getParameters() as $key => $value) {
            $query->setParameter($key, $value, $parsed->getType($key));
        }
    }

    private function addIdConditionWithOr(Criteria $criteria, EntityDefinition $definition, QueryBuilder $query): void
    {
        $wheres = [];

        foreach ($criteria->getIds() as $primaryKey) {
            if (!is_array($primaryKey)) {
                $primaryKey = ['id' => $primaryKey];
            }

            $where = [];

            foreach ($primaryKey as $storageName => $value) {
                $field = $definition->getFields()->getByStorageName($storageName);

                if ($field instanceof IdField || $field instanceof FkField) {
                    $value = Uuid::fromHexToBytes($value);
                }

                $key = 'pk' . Uuid::randomHex();

                $accessor = EntityDefinitionQueryHelper::escape($definition->getEntityName()) . '.' . EntityDefinitionQueryHelper::escape($storageName);

                $where[] = $accessor . ' = :' . $key;

                $query->setParameter($key, $value);
            }

            $wheres[] = '(' . implode(' AND ', $where) . ')';
        }

        $wheres = implode(' OR ', $wheres);

        $query->andWhere($wheres);
    }

    private function addQueries(EntityDefinition $definition, Criteria $criteria, QueryBuilder $query, Context $context): void
    {
        $queries = $this->getParser()->parseRanking(
            $criteria->getQueries(),
            $definition,
            $definition->getEntityName(),
            $context
        );
        if (empty($queries->getWheres())) {
            return;
        }

        $query->addState(EntityDefinitionQueryHelper::HAS_TO_MANY_JOIN);

        $select = 'SUM(' . implode(' + ', $queries->getWheres()) . ')';
        $query->addSelect($select . ' as _score');

        if (empty($criteria->getSorting())) {
            $query->addOrderBy('_score', 'DESC');
        }

        $minScore = array_map(function (ScoreQuery $query) {
            return $query->getScore();
        }, $criteria->getQueries());

        $minScore = min($minScore);

        $query->andHaving('_score >= :_minScore');
        $query->setParameter('_minScore', $minScore);
        $query->addState('_score');

        foreach ($queries->getParameters() as $key => $value) {
            $query->setParameter($key, $value, $queries->getType($key));
        }
    }

    private function addSortings(EntityDefinition $definition, array $sortings, QueryBuilder $query, Context $context): void
    {
        foreach ($sortings as $sorting) {
            $this->validateSortingDirection($sorting->getDirection());

            if ($sorting->getField() === '_score') {
                $query->addOrderBy('_score', $sorting->getDirection());
                $query->addState('_score');
                continue;
            }

            $accessor = $this->getDefinitionHelper()->getFieldAccessor($sorting->getField(), $definition, $definition->getEntityName(), $context);

            if ($sorting->getNaturalSorting()) {
                $query->addOrderBy('LENGTH(' . $accessor . ')', $sorting->getDirection());
            }

            $query->addOrderBy($accessor, $sorting->getDirection());
        }
    }

    /**
     * @return string[]
     */
    private function getFieldsByCriteria(Criteria $criteria): array
    {
        $fields = [];

        foreach ($criteria->getSorting() as $field) {
            $fields[] = $field->getFields();
        }

        foreach ($criteria->getFilters() as $field) {
            $fields[] = $field->getFields();
        }

        foreach ($criteria->getPostFilters() as $field) {
            $fields[] = $field->getFields();
        }

        foreach ($criteria->getQueries() as $field) {
            $fields[] = $field->getFields();
        }

        if (count($fields) === 0) {
            return [];
        }

        return array_unique(array_merge(...$fields));
    }

    /**
     * @throws InvalidSortingDirectionException
     */
    private function validateSortingDirection(string $direction): void
    {
        if (!in_array(strtoupper($direction), [FieldSorting::ASCENDING, FieldSorting::DESCENDING], true)) {
            throw new InvalidSortingDirectionException($direction);
        }
    }

    /**
     * Groups the anti joins by field name and anti join identifier
     */
    private function groupAntiJoinConditions(QueryBuilder $queryBuilder, ?Filter $filter, EntityDefinition $definition, Context $context): array
    {
        if (!$filter) {
            return [];
        }

        $antiJoins = [];
        $this->walkBottomUp($filter, static function (Filter $f) use (&$antiJoins): void {
            if ($f instanceof AntiJoinFilter) {
                $antiJoins[] = $f;
            }
        });

        $result = [];
        /** @var AntiJoinFilter $antiJoin */
        foreach ($antiJoins as $antiJoin) {
            $groupedFilter = [];
            /** @var Filter $f */
            foreach ($antiJoin->getQueries() as $f) {
                $field = @current($f->getFields());
                if (!isset($groupedFilter[$field])) {
                    $groupedFilter[$field] = [];
                }
                $groupedFilter[$field][] = $f;
            }

            foreach ($groupedFilter as $fieldName => $group) {
                $multiFilter = new MultiFilter($antiJoin->getOperator(), $group);
                $parseResult = $this->getParser()->parse($multiFilter, $definition, $context);

                foreach ($parseResult->getParameters() as $key => $value) {
                    $queryBuilder->setParameter($key, $value, $parseResult->getType($key));
                }

                if (!isset($result[$fieldName])) {
                    $result[$fieldName] = [];
                }

                $result[$fieldName][$antiJoin->getIdentifier()] = implode(' AND ', $parseResult->getWheres());
            }
        }

        return $result;
    }

    /**
     * Transforms NotFilter on associations into anti-joins
     *
     *
     * Base case:
     *
     * NotFilter($op, [EqualsFilter, ContainsFilter])
     *   -->
     * AntiJoin($op, [EqualsFilter, ContainsFilter])
     *
     *
     * Mixed case:
     *
     * NotFilter($op, [EqualsFilter, ContainsFilter, Node, Node])
     *   -->
     * MultiFilter(AND,
     *   AntiJoin($op, [ClosedTermOnAssociation, ClosedTermOnAssociation])
     *   NotFilter($op, [Node, Node])
     * )
     */
    private function antiJoinTransform(EntityDefinition $definition, Filter $filter): ?Filter
    {
        return $this->mapBottomUp($filter, function (Filter $notFilter) use ($definition) {
            if (!$notFilter instanceof NotFilter) {
                return $notFilter;
            }
            $op = $notFilter->getOperator();

            $normalFilters = [];
            $antiJoinFilters = [];
            /** @var Filter $childFilter */
            foreach ($notFilter->getQueries() as $childFilter) {
                $fields = $childFilter->getFields();
                $field = @current($fields);
                if ($childFilter instanceof MultiFilter
                    || count($fields) !== 1
                    || !$this->isAssociationPath($definition, $field)
                ) {
                    $normalFilters[] = $childFilter;
                    continue;
                }
                $antiJoinFilters[] = $childFilter;
            }

            if (empty($antiJoinFilters)) {
                return $notFilter;
            }

            if (empty($normalFilters)) {
                return new AntiJoinFilter($op, $antiJoinFilters);
            }

            return new MultiFilter(
                $op,
                [
                    new NotFilter($op, $normalFilters),
                    new AntiJoinFilter($op, $antiJoinFilters),
                ]
            );
        });
    }

    private function isAssociationPath(EntityDefinition $definition, string $fieldName): bool
    {
        $fieldName = str_replace('extensions.', '', $fieldName);
        $prefix = $definition->getEntityName() . '.';

        if (strpos($fieldName, $prefix) === 0) {
            $fieldName = substr($fieldName, \strlen($prefix));
        }

        $fields = $definition->getFields();
        if (!$fields->has($fieldName)) {
            $associationKey = explode('.', $fieldName);
            $fieldName = array_shift($associationKey);
        }

        $field = $fields->get($fieldName);

        return $field instanceof AssociationField;
    }

    /**
     * Transforms the filter tree with $mapFunction, starting from the leaf filter
     *
     * This can be used to rewrite a filter tree.
     */
    private function mapBottomUp(Filter $filter, \Closure $mapFunction): ?Filter
    {
        if ($filter instanceof MultiFilter) {
            $mapped = array_map(function ($f) use ($mapFunction) {
                return $this->mapBottomUp($f, $mapFunction);
            }, $filter->getQueries());
            $filtered = array_filter($mapped);

            if (empty($filtered)) {
                return null;
            }

            $op = $filter->getOperator();
            if ($filter instanceof NotFilter) {
                $filter = new NotFilter($op, $filtered);
            } elseif ($filter instanceof AntiJoinFilter) {
                $filter = new AntiJoinFilter($op, $filtered, $filter->getIdentifier());
            } else {
                $filter = new MultiFilter($op, $filtered);
            }
        }

        return $mapFunction($filter);
    }

    /**
     * Calls $callback for every filter in the filter tree, starting with the leafs
     */
    private function walkBottomUp(Filter $filter, \Closure $callback): void
    {
        $this->mapBottomUp($filter, static function (Filter $f) use ($callback) {
            $callback($f);

            return $f;
        });
    }
}
