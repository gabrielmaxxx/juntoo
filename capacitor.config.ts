import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.juntoo.mobile',
  appName: 'Juntoo',
  webDir: 'dist',
  server: {
    url: 'https://28c18fc3-0ed0-4d26-b645-81e4d3070b26.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
