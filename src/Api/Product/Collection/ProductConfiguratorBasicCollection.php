<?php declare(strict_types=1);

namespace Shopware\Api\Product\Collection;

use Shopware\Api\Configuration\Collection\ConfigurationGroupOptionBasicCollection;
use Shopware\Api\Entity\EntityCollection;
use Shopware\Api\Product\Struct\ProductConfiguratorBasicStruct;

class ProductConfiguratorBasicCollection extends EntityCollection
{
    /**
     * @var ProductConfiguratorBasicStruct[]
     */
    protected $elements = [];

    public function get(string $id): ? ProductConfiguratorBasicStruct
    {
        return parent::get($id);
    }

    public function current(): ProductConfiguratorBasicStruct
    {
        return parent::current();
    }

    public function getProductIds(): array
    {
        return $this->fmap(function (ProductConfiguratorBasicStruct $productConfigurator) {
            return $productConfigurator->getProductId();
        });
    }

    public function filterByProductId(string $id): self
    {
        return $this->filter(function (ProductConfiguratorBasicStruct $productConfigurator) use ($id) {
            return $productConfigurator->getProductId() === $id;
        });
    }

    public function getOptionIds(): array
    {
        return $this->fmap(function (ProductConfiguratorBasicStruct $productConfigurator) {
            return $productConfigurator->getOptionId();
        });
    }

    public function filterByOptionId(string $id): self
    {
        return $this->filter(function (ProductConfiguratorBasicStruct $productConfigurator) use ($id) {
            return $productConfigurator->getOptionId() === $id;
        });
    }

    public function getOptions(): ConfigurationGroupOptionBasicCollection
    {
        return new ConfigurationGroupOptionBasicCollection(
            $this->fmap(function (ProductConfiguratorBasicStruct $productConfigurator) {
                return $productConfigurator->getOption();
            })
        );
    }

    protected function getExpectedClass(): string
    {
        return ProductConfiguratorBasicStruct::class;
    }
}
