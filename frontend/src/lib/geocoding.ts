/**
 * Geocoding utilities using Nominatim (OpenStreetMap)
 */

export interface GeocodingResult {
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Convert coordinates to address using Nominatim reverse geocoding
 */
export async function coordinatesToAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MamaAntula-VecinoApp/1.0', // Required by Nominatim policy
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: GeocodingResult = await response.json();
    
    if (data.display_name) {
      // Try to extract a more readable address
      if (data.address) {
        const parts = [
          data.address.road,
          data.address.suburb,
          data.address.city,
          data.address.state,
        ].filter(Boolean);
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      return data.display_name;
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}