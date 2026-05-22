export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "customer" | "vendor" | "admin";
export type Plan = "free" | "premium";
export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "completed";
export type SubscriptionStatus = "active" | "expired" | "cancelled";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: Role;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      shops: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          slug: string;
          description: string | null;
          phone: string | null;
          address: string | null;
          location: string | null;
          opening_hours: string | null;
          is_open: boolean;
          is_approved: boolean;
          is_restricted: boolean;
          is_featured: boolean;
          image_url: string | null;
          logo_url: string | null;
          active_plan: Plan;
          plan_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shops"]["Row"]> & {
          vendor_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      dishes: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          price: number;
          offer_price: number | null;
          rating: number;
          rating_count: number;
          is_available: boolean;
          is_offer: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dishes"]["Row"]> & {
          shop_id: string;
          name: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["dishes"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          shop_id: string;
          token: string;
          customer_name: string | null;
          customer_phone: string | null;
          note: string | null;
          status: OrderStatus;
          total_amount: number;
          accepted_at: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          shop_id: string;
          total_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          dish_id: string;
          dish_name: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          order_id: string;
          dish_id: string;
          dish_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          shop_id: string;
          dish_id: string | null;
          customer_name: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]> & {
          shop_id: string;
          rating: number;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          vendor_id: string;
          shop_id: string | null;
          plan: Plan;
          status: SubscriptionStatus;
          starts_at: string;
          expires_at: string | null;
          razorpay_subscription_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          vendor_id: string;
          plan: Plan;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          vendor_id: string;
          subscription_id: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          amount: number;
          currency: string;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          vendor_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      shop_public_links: {
        Row: {
          id: string;
          shop_id: string;
          slug: string;
          qr_image_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shop_public_links"]["Row"]> & {
          shop_id: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["shop_public_links"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Shop = Database["public"]["Tables"]["shops"]["Row"];
export type Dish = Database["public"]["Tables"]["dishes"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
