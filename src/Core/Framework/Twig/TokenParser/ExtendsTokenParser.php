<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Twig\TokenParser;

use Shopware\Core\Framework\Twig\TemplateFinder;
use Twig\Node\Node;
use Twig\Parser;
use Twig\Token;
use Twig\TokenParser\AbstractTokenParser;

final class ExtendsTokenParser extends AbstractTokenParser
{
    /**
     * @var Parser
     */
    protected $parser;

    /**
     * @var TemplateFinder
     */
    private $finder;

    public function __construct(TemplateFinder $finder)
    {
        $this->finder = $finder;
    }

    /**
     * @return Node
     */
    public function parse(Token $token)
    {
        //get full token stream to inject extends token for inheritance
        $stream = $this->parser->getStream();

        $source = $stream->getSourceContext()->getName();

        $template = $stream->next()->getValue();

        $source = explode('/', $source);
        $source = array_shift($source);
        $source = ltrim($source, '@');

        //resolves parent template
        //set pointer to next value (contains the template file name)
        $parent = $this->finder->find($template, false, $source);

        //set pointer to end of line - BLOCK_END_TYPE
        $stream->next();

        $stream->injectTokens([
            new Token(Token::BLOCK_START_TYPE, '', 2),
            new Token(Token::NAME_TYPE, 'extends', 2),
            new Token(Token::STRING_TYPE, $parent, 2),
            new Token(Token::BLOCK_END_TYPE, '', 2),
        ]);
    }

    public function getTag(): string
    {
        return 'sw_extends';
    }
}
