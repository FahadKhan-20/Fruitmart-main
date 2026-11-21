/**
 * Location Service for Real-Time GPS & Address Resolution
 * Uses Browser Geolocation + OpenStreetMap Reverse Geocoding with BigDataCloud & IP Fallback
 */

export interface LocationDetails {
  shortName: string; // e.g. "Indiranagar, Bengaluru"
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  pincode?: string;
  city?: string;
  state?: string;
}

export const fetchRealTimeLocation = async (): Promise<LocationDetails> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      fetchIpLocation().then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // 1. Try OpenStreetMap Nominatim reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'MDFreshGroceryStore/1.0',
              },
              signal: AbortSignal.timeout(6000),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};

            const locality =
              addr.suburb ||
              addr.neighbourhood ||
              addr.residential ||
              addr.commercial ||
              addr.road ||
              addr.quarter ||
              'Nearby Locality';

            const city = addr.city || addr.town || addr.village || addr.county || 'Bengaluru';
            const state = addr.state || 'Karnataka';
            const pincode = addr.postcode || '';

            const shortName = `${locality}, ${city}`;
            const fullAddress = data.display_name || `${shortName}, ${state} ${pincode}`;

            resolve({
              shortName,
              fullAddress,
              latitude,
              longitude,
              pincode,
              city,
              state,
            });
            return;
          }
        } catch (nominatimErr) {
          console.warn('Nominatim reverse geocode note:', nominatimErr);
        }

        // 2. Try BigDataCloud reverse geocode fallback
        try {
          const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { signal: AbortSignal.timeout(5000) }
          );

          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            const locality = bdcData.locality || bdcData.city || 'Nearby Locality';
            const city = bdcData.city || 'Bengaluru';
            const state = bdcData.principalSubdivision || 'Karnataka';
            const pincode = bdcData.postcode || '';

            const shortName = `${locality}, ${city}`;
            const fullAddress = `${locality}, ${city}, ${state} ${pincode}`.trim();

            resolve({
              shortName,
              fullAddress,
              latitude,
              longitude,
              pincode,
              city,
              state,
            });
            return;
          }
        } catch (bdcErr) {
          console.warn('BigDataCloud reverse geocode note:', bdcErr);
        }

        // 3. Fallback coordinates formatted address
        resolve({
          shortName: `GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          fullAddress: `Current GPS Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), Bengaluru, Karnataka`,
          latitude,
          longitude,
          city: 'Bengaluru',
          state: 'Karnataka',
        });
      },
      (error) => {
        console.warn('Browser geolocation failed or permission denied, using IP fallback:', error.message);
        fetchIpLocation().then(resolve).catch(reject);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  });
};

/**
 * Fallback to IP Geolocation API if device GPS is not permitted
 */
export const fetchIpLocation = async (): Promise<LocationDetails> => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        const city = data.city || 'Bengaluru';
        const region = data.region || 'Karnataka';
        const postal = data.postal || '560001';
        return {
          shortName: `${city}, ${region}`,
          fullAddress: `${city}, ${region}, India - ${postal}`,
          latitude: data.latitude || 12.9352,
          longitude: data.longitude || 77.6245,
          pincode: postal,
          city,
          state: region,
        };
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const city = data.city || 'Bengaluru';
        const region = data.region || 'Karnataka';
        const postal = data.postal || '560001';
        return {
          shortName: `${city}, ${region}`,
          fullAddress: `${city}, ${region}, India - ${postal}`,
          latitude: data.latitude || 12.9352,
          longitude: data.longitude || 77.6245,
          pincode: postal,
          city,
          state: region,
        };
      }
    }
  } catch (e) {}

  // Standard MD FRESH Annasandrapalya Central Default Fallback
  return {
    shortName: 'Annasandrapalya, Bengaluru',
    fullAddress: 'Annasandrapalya Main Rd, HAL Post, Bengaluru, Karnataka 560017',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560017',
    latitude: 12.9592,
    longitude: 77.6548,
  };
};

/**
 * Live search locations via Nominatim API
 */
export const searchPlaces = async (query: string): Promise<LocationDetails[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=6&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'MDFreshGroceryStore/1.0',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return [];
    const results = await res.json();

    return results.map((item: any) => {
      const addr = item.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.road ||
        addr.residential ||
        item.name;
      const city = addr.city || addr.town || addr.village || 'Bengaluru';

      return {
        shortName: `${locality}, ${city}`,
        fullAddress: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        pincode: addr.postcode,
        city,
        state: addr.state,
      };
    });
  } catch (err) {
    console.error('Search places error:', err);
    return [];
  }
};
