import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  stateCode: string | null;
  error: string | null;
  loading: boolean;
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
};

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    city: null,
    stateCode: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState(prev => ({ ...prev, error: 'Geolocalização não suportada neste navegador' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get city name
        let city: string | null = null;
        let stateCode: string | null = null;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
            { headers: { 'User-Agent': 'Juntoo/1.0' } }
          );
          const data = await res.json();
          city = data?.address?.city || data?.address?.town || data?.address?.municipality || null;
          const stateName = data?.address?.state || null;
          if (stateName) {
            stateCode = STATE_NAME_TO_CODE[stateName] || null;
          }
        } catch {
          // Ignore reverse geocoding errors
        }

        setState({
          latitude,
          longitude,
          city,
          stateCode,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let message = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            message = 'Tempo esgotado ao buscar localização';
            break;
        }
        setState(prev => ({ ...prev, error: message, loading: false }));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { ...state, requestLocation };
};

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
export const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number) => deg * (Math.PI / 180);

/**
 * Format distance for display
 */
export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
};
