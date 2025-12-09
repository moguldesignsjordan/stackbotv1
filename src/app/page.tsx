"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore";
import type { Product } from "@/lib/types";

import {
  ArrowRight,
  Store,
  Search,
  Smartphone,
  Bike,
  Utensils,
  Car,
  Brush,
  Shirt,
} from "lucide-react";

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // LOAD PRODUCTS FROM FIRESTORE
  useEffect(() => {
    const load = async () => {
      try {
        const featuredSnap = await getDocs(
          query(collection(db, "products"), orderBy("created_at", "desc"), limit(4))
        );

        const popularSnap = await getDocs(
          query(collection(db, "products"), orderBy("views", "desc"), limit(8))
        );

        setFeatured(featuredSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        setPopular(popularSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      <OnboardingCards />

      <SectionWrapper title="Featured" link="/products">
        {loading ? (
          <LoadingRow />
        ) : featured.length > 0 ? (
          <Grid>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Grid>
        ) : (
          <EmptyMessage message="No featured products yet" />
        )}
      </SectionWrapper>

      <Categories />

      <SectionWrapper title="Popular" link="/products">
        {loading ? (
          <LoadingRow />
        ) : popular.length > 0 ? (
          <Grid>
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Grid>
        ) : (
          <EmptyMessage message="No popular products yet" />
        )}
      </SectionWrapper>

      <HowItWorks />
      <Footer />
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// NAVBAR
////////////////////////////////////////////////////////////////////////////////

function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={140}
            height={40}
            className="object-contain"
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/vendor-signup" className="font-medium text-sb-primary hover:underline">
            Become a Vendor
          </Link>

          <Link
            href="/login"
            className="bg-sb-primary text-white px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            Login
          </Link>
        </div>

        <Link
          href="/login"
          className="md:hidden bg-sb-primary text-white px-4 py-2 rounded-lg text-sm"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}

////////////////////////////////////////////////////////////////////////////////
// HERO SECTION
////////////////////////////////////////////////////////////////////////////////

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#55529d] to-[#7c78c9] py-24 md:py-40 text-white">
      <div className="max-w-7xl mx-auto px-6">

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Fast, smart delivery for the Caribbean.
        </h1>

        <p className="text-lg md:text-2xl mt-6 max-w-2xl opacity-90">
          From food to retail to local services — delivered with AI-powered logistics.
        </p>

        {/* SEARCH BAR — FIXED & MODERN */}
        <div className="mt-10 flex items-center gap-3 max-w-xl">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />

            <input
              type="text"
              placeholder="Search restaurants, markets, services..."
              className="
                w-full pl-12 pr-4 py-4 
                rounded-full 
                bg-white 
                text-gray-900 
                placeholder-purple-300 
                border-2 border-white
                shadow-[0_4px_20px_rgba(0,0,0,0.15)]
                focus:border-purple-500
                focus:ring-4 focus:ring-purple-200
                transition-all
              "
            />
          </div>

          <button
            className="
              h-12 w-12
              rounded-full 
              bg-white 
              shadow-lg 
              flex items-center justify-center 
              hover:bg-purple-100 
              transition
            "
          >
            <ArrowRight className="text-sb-primary font-bold" />
          </button>
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// ONBOARDING CARDS
////////////////////////////////////////////////////////////////////////////////

function OnboardingCards() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        
        <OnboardCard
          icon={<Bike className="h-14 w-14 text-sb-primary" />}
          title="Become a Driver"
          desc="Earn money delivering across the Caribbean on your schedule."
          link="/login?intent=driver"
          linkText="Start earning →"
        />

        <OnboardCard
          icon={<Store className="h-14 w-14 text-sb-primary" />}
          title="Become a Vendor"
          desc="Grow your business with smart logistics and a large customer base."
          link="/vendor-signup"
          linkText="Sign up →"
        />

        <OnboardCard
          icon={<Smartphone className="h-14 w-14 text-sb-primary" />}
          title="Order with StackBot"
          desc="Discover restaurants, shops, markets & more — delivered fast."
          link="/"
          linkText="Get the app →"
        />

      </div>
    </section>
  );
}

function OnboardCard({ icon, title, desc, link, linkText }: any) {
  return (
    <div className="p-10 bg-gray-50 rounded-3xl shadow-sm hover:shadow-xl transition">
      <div className="mb-6">{icon}</div>
      <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 mt-3 mb-6">{desc}</p>
      <Link href={link} className="text-sb-primary font-semibold hover:underline">
        {linkText}
      </Link>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// CATEGORIES (UPDATED)
////////////////////////////////////////////////////////////////////////////////

function Categories() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-10">Categories</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CategoryCard title="Restaurants" icon={<Utensils className="h-10 w-10" />} />
          <CategoryCard title="Taxi Service" icon={<Car className="h-10 w-10" />} />
          <CategoryCard title="Cleaning Service" icon={<Brush className="h-10 w-10" />} />
          <CategoryCard title="Retail Shops" icon={<Shirt className="h-10 w-10" />} />
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ title, icon }: any) {
  return (
    <div
      className="
        p-6 bg-white
        rounded-2xl 
        border border-gray-200 
        hover:border-purple-400 
        hover:shadow-xl 
        transition-all text-center
        flex flex-col items-center justify-center
      "
    >
      <div
        className="
          h-20 w-20 
          flex items-center justify-center 
          rounded-full 
          bg-purple-100 
          text-purple-700 
          mb-4 shadow-inner
        "
      >
        {icon}
      </div>

      <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// PRODUCT GRID / WRAPPERS
////////////////////////////////////////////////////////////////////////////////

function SectionWrapper({ title, link, children }: any) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <Link href={link} className="text-sb-primary text-sm font-medium hover:underline">
            View All →
          </Link>
        </div>

        {children}
      </div>
    </section>
  );
}

function Grid({ children }: any) {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{children}</div>;
}

////////////////////////////////////////////////////////////////////////////////
// PRODUCT CARD
////////////////////////////////////////////////////////////////////////////////

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl transition p-3">
      <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={300}
            height={300}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Image
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-semibold">{product.name}</h3>
        <p className="text-sm text-gray-500">{product.vendor_name || "Vendor"}</p>
        <p className="font-bold text-gray-900 mt-1">${product.price}</p>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// LOADING & EMPTY STATES (FIXED)
////////////////////////////////////////////////////////////////////////////////

function LoadingRow() {
  return (
    <div className="text-center py-12 text-gray-400 text-lg">
      Loading...
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-500 text-lg">
      {message}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// HOW IT WORKS
////////////////////////////////////////////////////////////////////////////////

function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-purple-50 to-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-12">How StackBot Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <HowCard number="1" title="Browse" desc="Explore restaurants, stores, and services near you." />
          <HowCard number="2" title="Order" desc="Add items to cart and check out quickly and securely." />
          <HowCard number="3" title="Delivered" desc="Track your delivery in real time with PIN security." />
        </div>
      </div>
    </section>
  );
}

function HowCard({ number, title, desc }: any) {
  return (
    <div className="p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl transition">
      <div className="h-12 w-12 rounded-full bg-purple-200 text-sb-primary flex items-center justify-center mx-auto text-xl font-bold mb-5">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 mt-3">{desc}</p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// FOOTER
////////////////////////////////////////////////////////////////////////////////

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-20 px-6 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

        <FooterCol title="Get to Know Us" links={["About", "Careers", "Blog", "Newsroom"]} />
        <FooterCol title="Let Us Help You" links={["Account", "Order History", "Support"]} />
        <FooterCol title="Do Business With Us" links={["Become a Driver", "Become a Vendor"]} />

        <div>
          <h4 className="font-bold mb-4">Download App</h4>
          <div className="space-y-3">
            <div className="bg-white/10 rounded-xl p-3">App Store</div>
            <div className="bg-white/10 rounded-xl p-3">Google Play</div>
          </div>
        </div>

      </div>

      <p className="text-center text-gray-500 text-sm mt-12">
        © 2026 StackBot. All rights reserved.
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: any) {
  return (
    <div>
      <h4 className="font-semibold mb-4">{title}</h4>
      <ul className="space-y-2 text-gray-400 text-sm">
        {links.map((l: string) => (
          <li key={l} className="hover:text-white cursor-pointer">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
