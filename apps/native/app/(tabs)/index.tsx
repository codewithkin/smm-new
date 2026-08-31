import { Ionicons } from "@expo/vector-icons";
import { Button, Chip, Input, Spinner, useThemeColor } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { useCart } from "@/contexts/cart-context";
import { useDatabase } from "@/contexts/database-context";
import { productQueries } from "@/lib/db/database";
import { CATEGORY_META, CATEGORIES, formatCurrency } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

export default function PointOfSale() {
  const { db, isReady } = useDatabase();
  const { add, itemCount, subtotal } = useCart();
  const accentColor = useThemeColor("accent");
  const accentForegroundColor = useThemeColor("accent-foreground");

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = query.trim()
      ? await productQueries.search(db, query.trim())
      : await productQueries.listActive(db);
    const filtered = category ? data.filter((p) => p.category === category) : data;
    setProducts(filtered);
    setLoading(false);
  }, [db, query, category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Container isScrollable={false} className="pb-0">
      {!isReady && (
        <View className="flex-1 items-center justify-center">
          <Spinner />
          <Text className="mt-3 text-muted">Opening database...</Text>
        </View>
      )}

      {isReady && (
        <View className="flex-1">
          <View className="px-4 pt-3">
            <View className="flex-row items-center gap-2 bg-surface-secondary rounded-xl px-3">
              <Ionicons name="search" size={18} color={accentColor} />
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or SKU..."
                className="flex-1"
                autoCorrect={false}
                variant="secondary"
              />
            </View>
            <View className="mt-3 flex-row flex-wrap">
              <Chip
                variant={category === null ? "primary" : "secondary"}
                color="accent"
                onPress={() => setCategory(null)}
                className="mr-2 mb-2"
              >
                <Chip.Label>All</Chip.Label>
              </Chip>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  variant={category === cat ? "primary" : "secondary"}
                  color="accent"
                  onPress={() => setCategory(category === cat ? null : cat)}
                  className="mr-2 mb-2"
                >
                  <Chip.Label>{CATEGORY_META[cat].label}</Chip.Label>
                </Chip>
              ))}
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <Spinner />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              contentContainerStyle={{ padding: 12, paddingBottom: 130 }}
              columnWrapperStyle={{ gap: 12 }}
              ListEmptyComponent={
                <View className="items-center justify-center py-16">
                  <Ionicons name="cube-outline" size={40} color={accentColor} />
                  <Text className="text-muted mt-3">No products found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => {
                    if (item.stock <= 0) return;
                    add({
                      productId: item.id,
                      name: item.name,
                      price: item.price,
                      stock: item.stock,
                      category: item.category,
                    });
                  }}
                />
              )}
            />
          )}

          {itemCount > 0 && (
            <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted text-sm">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </Text>
                <Text className="text-lg font-semibold text-foreground">
                  {formatCurrency(subtotal)}
                </Text>
              </View>
              <Button className="mt-2">
                <Ionicons name="cart" size={18} color={accentForegroundColor} />
                <Button.Label>View Cart</Button.Label>
              </Button>
            </View>
          )}
        </View>
      )}
    </Container>
  );
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const accentColor = useThemeColor("accent");
  const sellable = product.stock > 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!sellable}
      className={`flex-1 bg-surface-secondary rounded-xl p-3 ${sellable ? "" : "opacity-50"}`}
    >
      <View className="flex-row items-center justify-between">
        <Ionicons
          name={CATEGORY_META[product.category]?.icon as never}
          size={18}
          color={accentColor}
        />
        {!sellable && <Text className="text-xs text-danger">Out</Text>}
      </View>
      <Text className="mt-2 text-foreground font-medium leading-5" numberOfLines={2}>
        {product.name}
      </Text>
      <Text className="text-xs text-muted mt-0.5">{product.sku}</Text>
      <Text className="mt-2 text-foreground font-semibold">
        {formatCurrency(product.price)}
      </Text>
    </Pressable>
  );
}
