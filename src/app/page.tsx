"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore";
import type { Product } from "@/lib/types";

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVIGATION */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/vendor-signup"
              className="text-sb-primary font-medium hover:underline"
            >
              Become a Vendor
            </Link>

            <Link
              href="/login"
              className="bg-sb-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Smart logistics for the Caribbean
            </h1>
            
            <p className="mt-6 text-xl text-gray-600">
              Connect to groceries, restaurants, beauty services, taxis, and U.S. imports—delivered fast and secure with AI-powered logistics.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <input
                type="text"
                placeholder="Search products or services..."
                className="flex-1 max-w-md border border-gray-200 rounded-lg px-5 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent"
              />
            </div>

            <div className="mt-12 flex items-center gap-8">
              <Stat label="On-time delivery" value="99%" />
              <Stat label="Vendor partners" value="500+" />
              <Stat label="Support" value="24/7" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <SectionWrapper title="Featured" link="/products">
        {loading ? (
          <LoadingRow />
        ) : featured.length === 0 ? (
          <EmptyMessage message="No featured products yet" />
        ) : (
          <Grid cols={4}>
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </Grid>
        )}
      </SectionWrapper>

      {/* CATEGORIES */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Categories</h2>
          <Grid cols={4}>
            <CategoryCard title="Restaurants" available />
            <CategoryCard title="Taxi Service" />
            <CategoryCard title="Cleaning Service" />
            <CategoryCard title="Retail Shops" available />
          </Grid>
        </div>
      </section>

      {/* POPULAR PRODUCTS */}
      <SectionWrapper title="Popular" link="/products">
        {loading ? (
          <LoadingRow />
        ) : popular.length === 0 ? (
          <EmptyMessage message="No popular products yet" />
        ) : (
          <Grid cols={4}>
            {popular.map((p) => <ProductCard key={p.id} product={p} />)}
          </Grid>
        )}
      </SectionWrapper>

      {/* WHY STACKBOT */}
      <section className="py-20 px-6 bg-sb-primary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Why StackBot
          </h2>
          <Grid cols={3}>
            <Feature 
              title="AI-First Logistics"
              description="PIN-based deliveries and smart scheduling keep everything fast and precise"
            />
            <Feature 
              title="Vendor Growth"
              description="Power small businesses with data, tracking, and actionable insights"
            />
            <Feature 
              title="End-to-End Control"
              description="Platform, deliveries, and vendor tools unified in one ecosystem"
            />
          </Grid>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <FAQ 
              question="What is StackBot?" 
              answer="StackBot is a smart logistics platform connecting Caribbean customers to local vendors, restaurants, and services with AI-powered delivery and tracking."
            />
            <FAQ 
              question="How do I place an order?" 
              answer="Simply search for products or services, add items to your cart, and check out. You'll receive real-time tracking updates via SMS and email."
            />
            <FAQ 
              question="How does delivery work?" 
              answer="Our AI-optimized logistics network ensures fast, secure deliveries with PIN-based verification and real-time tracking."
            />
            <FAQ 
              question="Can I buy from U.S. stores?" 
              answer="Yes! StackBot offers import services from select U.S. retailers with transparent pricing and delivery timelines."
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ==================== COMPONENTS ==================== */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-sb-primary">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function SectionWrapper({ 
  title, 
  link, 
  children 
}: { 
  title: string; 
  link: string; 
  children: React.ReactNode 
}) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <Link href={link} className="text-sb-primary text-sm font-medium hover:underline">
            View all
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}

function Grid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  const gridCols = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  };
  
  return (
    <div className={`grid grid-cols-1 ${gridCols[cols as keyof typeof gridCols]} gap-6`}>
      {children}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="col-span-4 text-center py-12 text-gray-400">Loading...</div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="col-span-4 text-center py-12 text-gray-500">{message}</div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition group">
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {product.images?.[0] ? (
          <Image 
            src={product.images[0]} 
            alt={product.name}
            width={300}
            height={300}
            className="object-cover"
          />
        ) : (
          <span className="text-gray-300 text-xs">No Image</span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-sb-primary transition">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {product.vendor_name || "Vendor"}
        </p>
        <p className="font-bold text-gray-900 mt-2">${product.price}</p>
      </div>
    </div>
  );
}

function CategoryCard({ title, available }: { title: string; available?: boolean }) {
  return (
    <div className={`bg-white rounded-lg p-6 border border-gray-100 hover:border-sb-primary transition cursor-pointer ${!available ? 'opacity-60' : ''}`}>
      <div className="w-full h-20 bg-gray-50 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-gray-300 text-xs">Icon</span>
      </div>
      
      <h3 className="font-semibold text-gray-900 text-center">{title}</h3>
      
      {!available && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">Coming Soon</span>
        </div>
      )}
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center">
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-purple-100">{description}</p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="bg-white border border-gray-100 rounded-lg p-5 group hover:border-gray-200 transition">
      <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
        {question}
        <span className="text-sb-primary text-xl group-open:rotate-45 transition-transform">+</span>
      </summary>
      <p className="mt-4 text-gray-600 leading-relaxed">{answer}</p>
    </details>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-sb-primary rounded-lg flex items-center justify-center">
              <Image
                src="/stackbot-logo-white.png"
                alt="StackBot Logo"
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold">StackBot</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Smart security and seamless delivery solutions for the modern Caribbean.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Products</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="text-gray-400 hover:text-white transition">Home</Link></li>
            <li><Link href="/categories" className="text-gray-400 hover:text-white transition">Categories</Link></li>
            <li><Link href="/products" className="text-gray-400 hover:text-white transition">All Products</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="text-gray-400 hover:text-white transition">About Us</Link></li>
            <li><Link href="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
            <li><Link href="/vendor-signup" className="text-gray-400 hover:text-white transition">Become a Vendor</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Stay Updated</h4>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent"
          />
          <button className="w-full mt-2 bg-sb-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
            Subscribe
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
        © 2026 StackBot. All rights reserved.
      </div>
    </footer>
  );
}