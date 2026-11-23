'use client';

import LocationModal from './modals/LocationModal';
import AuthModal from './modals/AuthModal';
import CartDrawer from './cart/CartDrawer';
import StoreHydrator from './StoreHydrator';

export default function ClientModals() {
  return (
    <>
      <StoreHydrator />
      <LocationModal />
      <AuthModal />
      <CartDrawer />
    </>
  );
}
