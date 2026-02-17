import { useState, useCallback, useContext } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import cartService from '../services/cartService';

export const useAddToCart = () => {
  const { userAuth } = useContext(AuthContext);
  const { showAuthModal } = useAuthModal();
  const [addingToCart, setAddingToCart] = useState({});

  const addToCartInternal = useCallback(async (productId, productName) => {
    setAddingToCart((prev) => ({ ...prev, [productId]: true }));

    try {
      const response = await cartService.addToCart(productId, 1);

      if (response.success) {
        toast.success(`${productName} added to cart!`);
      } else if (response.requiresAuth) {
        showAuthModal(() => addToCartInternal(productId, productName));
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Something went wrong while adding to cart');
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  }, [showAuthModal]);

  const handleAddToCart = useCallback(async (productId, productName) => {
    if (!userAuth.isAuthenticated || !userAuth.token) {
      showAuthModal(() => addToCartInternal(productId, productName));
      return;
    }

    await addToCartInternal(productId, productName);
  }, [userAuth, showAuthModal, addToCartInternal]);

  return { addingToCart, handleAddToCart };
};
