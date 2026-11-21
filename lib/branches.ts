/**
 * MD FRESH - Multi-Branch Dark Store & Fulfillment Routing Engine
 * Automatically assigns incoming grocery orders to the nearest store hub using GPS / Haversine distance.
 */

export interface ShopBranch {
  id: string;
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  managerName: string;
  status: 'active' | 'busy' | 'offline';
  deliveryRadiusKm: number;
  keywords: string[];
}

export const SHOP_BRANCHES: ShopBranch[] = [
  {
    id: 'branch-indiranagar',
    name: 'MD FRESH - Indiranagar Hub (Branch #101)',
    shortName: 'Indiranagar Hub',
    address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
    latitude: 12.9716,
    longitude: 77.6412,
    phone: '+91 80 2520 1101',
    managerName: 'Arun Kumar',
    status: 'active',
    deliveryRadiusKm: 15,
    keywords: [
      'indiranagar',
      'hal',
      'domlur',
      'ulsoor',
      'cv raman',
      'kaggadasapura',
      'vignananagara',
      'namjoshi',
      'talacauvery',
      'murugeshpalya',
      'thippasandra',
      'old airport',
      'jeevanbheemanagar',
      'bengaluru east',
      'east'
    ],
  },
  {
    id: 'branch-koramangala',
    name: 'MD FRESH - Koramangala Hub (Branch #102)',
    shortName: 'Koramangala Hub',
    address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034',
    latitude: 12.9352,
    longitude: 77.6245,
    phone: '+91 80 2553 1102',
    managerName: 'Fahad Qureshi',
    status: 'active',
    deliveryRadiusKm: 15,
    keywords: [
      'koramangala',
      'btm',
      'ejipura',
      'adugodi',
      'tavarekere',
      'dairy circle',
      'st johns',
      'nimhans',
      'madiwala',
      'south'
    ],
  },
  {
    id: 'branch-hsr',
    name: 'MD FRESH - HSR Layout Hub (Branch #103)',
    shortName: 'HSR Layout Hub',
    address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru 560102',
    latitude: 12.9116,
    longitude: 77.6534,
    phone: '+91 80 2258 1103',
    managerName: 'Suresh Gowda',
    status: 'active',
    deliveryRadiusKm: 15,
    keywords: [
      'hsr',
      'hsr layout',
      'bellandur',
      'sarjapur',
      'haralur',
      'kasavanahalli',
      'singasandra',
      'ibblur',
      'agara',
      'kudlu'
    ],
  },
  {
    id: 'branch-whitefield',
    name: 'MD FRESH - Whitefield & ITPL Hub (Branch #104)',
    shortName: 'Whitefield Hub',
    address: 'ITPL Main Rd, Near Hope Farm, Whitefield, Bengaluru 560066',
    latitude: 12.9854,
    longitude: 77.7279,
    phone: '+91 80 2845 1104',
    managerName: 'Deepak Verma',
    status: 'active',
    deliveryRadiusKm: 20,
    keywords: [
      'whitefield',
      'itpl',
      'brookefield',
      'hoodi',
      'kadugodi',
      'varthur',
      'marathahalli',
      'hope farm',
      'kundalahalli',
      'channasandra',
      'mahadevapura'
    ],
  },
  {
    id: 'branch-jayanagar',
    name: 'MD FRESH - Jayanagar & JP Nagar Hub (Branch #105)',
    shortName: 'Jayanagar Hub',
    address: '11th Main Rd, 4th Block, Jayanagar, Bengaluru 560011',
    latitude: 12.9250,
    longitude: 77.5838,
    phone: '+91 80 2664 1105',
    managerName: 'Raghavan Nair',
    status: 'active',
    deliveryRadiusKm: 15,
    keywords: [
      'jayanagar',
      'jp nagar',
      'banashankari',
      'basavanagudi',
      'wilson garden',
      'padmanabhanagar',
      'lalbagh',
      'shanthi nagar',
      'giri nagar'
    ],
  },
];

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface NearestBranchResult {
  branch: ShopBranch;
  distanceKm: number;
  etaMinutes: number;
  routedBy: 'gps_exact' | 'address_match' | 'default_nearest';
}

/**
 * Finds the nearest shop branch based on customer GPS coordinates or address text
 */
export function findNearestBranch(
  customerLat?: number | null,
  customerLng?: number | null,
  addressText?: string | null
): NearestBranchResult {
  const activeBranches = SHOP_BRANCHES.filter((b) => b.status === 'active');
  const pool = activeBranches.length > 0 ? activeBranches : SHOP_BRANCHES;

  // 1. If GPS coordinates are available, calculate exact distances
  if (
    customerLat != null &&
    customerLng != null &&
    !isNaN(customerLat) &&
    !isNaN(customerLng) &&
    customerLat !== 0 &&
    customerLng !== 0
  ) {
    let nearestBranch = pool[0];
    let minDistance = Infinity;

    for (const branch of pool) {
      const dist = calculateDistance(
        customerLat,
        customerLng,
        branch.latitude,
        branch.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestBranch = branch;
      }
    }

    // Estimate delivery ETA: 7 mins prep/pack + ~2 mins per km, min 9 mins, max 25 mins
    const eta = Math.min(25, Math.max(9, Math.round(7 + minDistance * 2.2)));

    return {
      branch: nearestBranch,
      distanceKm: minDistance,
      etaMinutes: eta,
      routedBy: 'gps_exact',
    };
  }

  // 2. Keyword fallback matching on address text
  if (addressText) {
    const textLower = addressText.toLowerCase();
    for (const branch of pool) {
      for (const kw of branch.keywords) {
        if (textLower.includes(kw)) {
          return {
            branch,
            distanceKm: 2.1,
            etaMinutes: 11,
            routedBy: 'address_match',
          };
        }
      }
    }
  }

  // 3. Central default branch (Koramangala Hub)
  const defaultBranch = pool.find((b) => b.id === 'branch-koramangala') || pool[0];
  return {
    branch: defaultBranch,
    distanceKm: 1.5,
    etaMinutes: 10,
    routedBy: 'default_nearest',
  };
}

export function getAllBranches(): ShopBranch[] {
  return SHOP_BRANCHES;
}

export function getBranchById(id: string): ShopBranch | undefined {
  return SHOP_BRANCHES.find((b) => b.id === id);
}
