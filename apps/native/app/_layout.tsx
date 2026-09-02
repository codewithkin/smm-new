import "@/global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { CartProvider } from "@/contexts/cart-context";
import { DatabaseProvider } from "@/contexts/database-context";
import { useLoadedFonts } from "@/lib/fonts";

// Keep the splash visible until fonts have loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: "first-run",
};

function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="first-run" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="checkout"
        options={{ presentation: "transparentModal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

export default function Layout() {
  const [fontsLoaded, fontsError] = useLoadedFonts();

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <DatabaseProvider>
            <CartProvider>
              <HeroUINativeProvider>
                <StackLayout />
              </HeroUINativeProvider>
            </CartProvider>
          </DatabaseProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
