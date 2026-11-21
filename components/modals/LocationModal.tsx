'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Loader2, 
  Home, 
  Briefcase, 
  Check, 
  Clock, 
  AlertCircle,
  Sparkles,
  Store 
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { 
  fetchRealTimeLocation, 
  searchPlaces, 
  LocationDetails 
} from '@/lib/services/locationService';

export default function LocationModal() {
  const { 
    isLocationModalOpen, 
    setLocationModalOpen, 
    setLocation, 
    location, 
    fullAddress, 
    addresses,
    nearestBranch,
    branchDistanceKm,
    deliveryEtaMinutes
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LocationDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle place searching with debounce
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(search);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Real-time GPS detection
  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setErrorMessage('');
    try {
      const locDetails = await fetchRealTimeLocation();
      setLocation(locDetails.shortName, locDetails.fullAddress, locDetails.latitude, locDetails.longitude);
      setLocationModalOpen(false);
    } catch (err: any) {
      console.error('Detection error:', err);
      setErrorMessage('Could not detect exact location. Please select an area below.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSelectLocation = (loc: LocationDetails) => {
    setLocation(loc.shortName, loc.fullAddress, loc.latitude, loc.longitude);
    setLocationModalOpen(false);
  };

  if (!isLocationModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl rounded-3xl border border-gray-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-black text-green-800 uppercase tracking-wider">
                  Farm Fresh Delivery
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-1">Select Delivery Location</h2>
            </div>
            
            {location && (
              <button
                onClick={() => setLocationModalOpen(false)}
                className="p-2 text-gray-400 transition-colors bg-white rounded-full hover:bg-gray-100 hover:text-gray-600 shadow-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {/* Real-Time GPS Detection Button */}
            <button
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="flex items-center justify-between w-full p-4 font-bold text-green-800 transition-all bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-2xl hover:border-green-500 hover:shadow-md cursor-pointer active:scale-[0.99] disabled:opacity-75"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-sm">
                  {isDetecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-gray-900">
                    {isDetecting ? 'Detecting Real-Time Location...' : 'Detect My Current Location'}
                  </div>
                  <div className="text-xs text-green-700 font-semibold">
                    Using Device GPS & Real-Time OpenStreetMap
                  </div>
                </div>
              </div>
              <span className="text-xs font-black bg-white/80 px-2.5 py-1 rounded-lg text-green-800 shadow-xs">
                GPS
              </span>
            </button>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Search Bar for Live Places */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                placeholder="Search area, street, or apartment name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-3.5 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white text-sm font-medium text-gray-900"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 border border-gray-100 p-2 bg-gray-50/60 rounded-2xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-1">
                  Matching Addresses
                </p>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(item)}
                    className="flex items-start w-full gap-3 p-3 transition-colors rounded-xl bg-white hover:bg-green-50/80 border border-gray-100 text-left cursor-pointer group"
                  >
                    <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-gray-900 group-hover:text-green-800">
                        {item.shortName}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {item.fullAddress}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Current Active Location & Assigned Store Hub */}
            {location && (
              <div className="p-3.5 bg-green-50/80 border border-green-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-green-700">Currently Delivering To</div>
                      <div className="text-sm font-black text-gray-900 truncate" suppressHydrationWarning>{location}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-green-800 bg-white px-2 py-0.5 rounded shadow-xs">
                    GPS Active
                  </span>
                </div>

                {nearestBranch && (
                  <div className="pt-2 border-t border-green-200/60 flex items-center justify-between text-xs text-green-950 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Store className="w-3.5 h-3.5 text-green-700 shrink-0" />
                      <span className="truncate">Fulfillment Hub: <strong>{nearestBranch.shortName}</strong> ({branchDistanceKm} km)</span>
                    </div>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                      ~{deliveryEtaMinutes || 10} Mins
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Saved Addresses (Blinkit style Home, Work, etc.) */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5">
                Saved & Popular Delivery Hubs
              </p>
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() =>
                      handleSelectLocation({
                        shortName: addr.shortName,
                        fullAddress: addr.fullAddress,
                      })
                    }
                    className="flex items-center justify-between w-full p-3.5 transition-all bg-white rounded-2xl border border-gray-100 hover:border-green-300 hover:bg-green-50/40 text-left cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-green-100 group-hover:text-green-700 text-gray-600 flex items-center justify-center shrink-0 transition-colors">
                        {addr.type === 'Home' ? (
                          <Home className="w-4 h-4" />
                        ) : addr.type === 'Work' ? (
                          <Briefcase className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <span>{addr.shortName}</span>
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {addr.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{addr.fullAddress}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-green-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
