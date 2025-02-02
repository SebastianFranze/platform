<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Test\Cart\Promotion\Helpers\Traits;

use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Checkout\Cart\SalesChannel\CartService;
use Shopware\Core\Checkout\Promotion\Cart\PromotionItemBuilder;
use Shopware\Core\Checkout\Promotion\Cart\PromotionProcessor;
use Shopware\Core\Checkout\Promotion\Subscriber\Storefront\StorefrontCartSubscriber;
use Shopware\Core\Content\Product\Cart\ProductLineItemFactory;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Session\Session;

trait PromotionIntegrationTestBehaviour
{
    /**
     * This function makes sure all our required session data
     * is gone after clearing it.
     */
    public function clearSession(): void
    {
        /** @var Session $session */
        $session = $this->getContainer()->get('session');

        $session->set(StorefrontCartSubscriber::SESSION_KEY_PROMOTION_CODES, []);
    }

    /**
     * Adds the provided product to the cart.
     *
     * @throws \Shopware\Core\Checkout\Cart\Exception\InvalidQuantityException
     * @throws \Shopware\Core\Checkout\Cart\Exception\LineItemNotStackableException
     * @throws \Shopware\Core\Checkout\Cart\Exception\MixedLineItemTypeException
     */
    public function addProduct(string $productId, int $quantity, Cart $cart, CartService $cartService, SalesChannelContext $context): Cart
    {
        $factory = new ProductLineItemFactory();
        $product = $factory->create($productId, ['quantity' => $quantity]);

        return $cartService->add($cart, $product, $context);
    }

    /**
     * Adds the provided code to the current cart.
     */
    public function addPromotionCode(string $code, Cart $cart, CartService $cartService, SalesChannelContext $context): Cart
    {
        $itemBuilder = new PromotionItemBuilder();

        /** @var LineItem $lineItem */
        $lineItem = $itemBuilder->buildPlaceholderItem($code, $context->getContext()->getCurrencyPrecision());

        /** @var Cart $cart */
        $cart = $cartService->add($cart, $lineItem, $context);

        return $cart;
    }

    /**
     * Removes the provided code to the current cart.
     */
    public function removePromotionCode(string $code, Cart $cart, CartService $cartService, SalesChannelContext $context): Cart
    {
        /** @var LineItem[] $promotions */
        $promotions = $cart->getLineItems()->filterType(PromotionProcessor::LINE_ITEM_TYPE);

        /** @var LineItem $promotion */
        foreach ($promotions as $promotion) {
            if ($promotion->getReferencedId() === $code) {
                return $cartService->remove($cart, $promotion->getId(), $context);
            }
        }

        return $cart;
    }

    /**
     * Gets all promotion codes that have been added
     * to the current session.
     */
    public function getSessionCodes(): array
    {
        /** @var Session $session */
        $session = $this->getContainer()->get('session');

        if (!$session->has(StorefrontCartSubscriber::SESSION_KEY_PROMOTION_CODES)) {
            return [];
        }

        return $session->get(StorefrontCartSubscriber::SESSION_KEY_PROMOTION_CODES);
    }
}
