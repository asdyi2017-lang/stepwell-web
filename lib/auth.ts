import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "healthcomp_token";

export async function saveToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem(KEY);
  }
  return await SecureStore.getItemAsync(KEY);
}

export async function clearToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}