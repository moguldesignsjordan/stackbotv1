// src/app/api/customer/addresses/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';
import { SavedAddress, AddressFormData } from '@/lib/types/address';

// GET - Fetch all addresses for authenticated customer
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(decodedToken.uid);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ addresses: [], pinnedAddressId: null });
    }

    const data = customerDoc.data();
    const addresses: SavedAddress[] = data?.savedAddresses || [];
    const pinnedAddressId = data?.pinnedAddressId || null;

    // If they have old defaultAddress but no savedAddresses, migrate it
    if (addresses.length === 0 && data?.defaultAddress?.street) {
      const migratedAddress: SavedAddress = {
        id: `addr_${Date.now()}`,
        label: 'Home',
        street: data.defaultAddress.street,
        city: data.defaultAddress.city,
        state: data.defaultAddress.state || '',
        postalCode: data.defaultAddress.postalCode || '',
        country: data.defaultAddress.country || 'Dominican Republic',
        instructions: data.defaultAddress.instructions || '',
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save migrated address
      await customerRef.update({
        savedAddresses: [migratedAddress],
        pinnedAddressId: migratedAddress.id,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return NextResponse.json({
        addresses: [migratedAddress],
        pinnedAddressId: migratedAddress.id,
      });
    }

    return NextResponse.json({ addresses, pinnedAddressId });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST - Add a new address
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body: AddressFormData = await request.json();

    // Validate required fields
    if (!body.label?.trim() || !body.street?.trim() || !body.city?.trim()) {
      return NextResponse.json(
        { error: 'Label, street, and city are required' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(decodedToken.uid);
    const customerDoc = await customerRef.get();

    const existingAddresses: SavedAddress[] = customerDoc.exists
      ? customerDoc.data()?.savedAddresses || []
      : [];

    // Limit to 10 addresses
    if (existingAddresses.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 addresses allowed' },
        { status: 400 }
      );
    }

    const newAddress: SavedAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: body.label.trim(),
      street: body.street.trim(),
      city: body.city.trim(),
      state: body.state?.trim() || '',
      postalCode: body.postalCode?.trim() || '',
      country: body.country?.trim() || 'Dominican Republic',
      instructions: body.instructions?.trim() || '',
      isPinned: body.isPinned || existingAddresses.length === 0, // First address is auto-pinned
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If this is pinned, unpin others
    let updatedAddresses = existingAddresses;
    if (newAddress.isPinned) {
      updatedAddresses = existingAddresses.map((addr) => ({
        ...addr,
        isPinned: false,
      }));
    }

    updatedAddresses.push(newAddress);

    const updateData: Record<string, unknown> = {
      savedAddresses: updatedAddresses,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (newAddress.isPinned) {
      updateData.pinnedAddressId = newAddress.id;
      // Also update defaultAddress for backwards compatibility
      updateData.defaultAddress = {
        street: newAddress.street,
        city: newAddress.city,
        state: newAddress.state,
        postalCode: newAddress.postalCode,
        country: newAddress.country,
        instructions: newAddress.instructions,
      };
    }

    await customerRef.set(updateData, { merge: true });

    return NextResponse.json({ address: newAddress, addresses: updatedAddresses });
  } catch (error) {
    console.error('Error adding address:', error);
    return NextResponse.json({ error: 'Failed to add address' }, { status: 500 });
  }
}

// PATCH - Update an address or pin/unpin
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { addressId, ...updates } = body;

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(decodedToken.uid);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const existingAddresses: SavedAddress[] = customerDoc.data()?.savedAddresses || [];
    const addressIndex = existingAddresses.findIndex((a) => a.id === addressId);

    if (addressIndex === -1) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Update the address
    let updatedAddresses = [...existingAddresses];
    
    // If setting as pinned, unpin all others
    if (updates.isPinned) {
      updatedAddresses = updatedAddresses.map((addr) => ({
        ...addr,
        isPinned: addr.id === addressId,
      }));
    }

    // Apply other updates to the specific address
    updatedAddresses[addressIndex] = {
      ...updatedAddresses[addressIndex],
      ...(updates.label && { label: updates.label.trim() }),
      ...(updates.street && { street: updates.street.trim() }),
      ...(updates.city && { city: updates.city.trim() }),
      ...(updates.state !== undefined && { state: updates.state.trim() }),
      ...(updates.postalCode !== undefined && { postalCode: updates.postalCode.trim() }),
      ...(updates.country && { country: updates.country.trim() }),
      ...(updates.instructions !== undefined && { instructions: updates.instructions.trim() }),
      ...(updates.isPinned !== undefined && { isPinned: updates.isPinned }),
      updatedAt: new Date().toISOString(),
    };

    const pinnedAddress = updatedAddresses.find((a) => a.isPinned);
    
    const updateData: Record<string, unknown> = {
      savedAddresses: updatedAddresses,
      pinnedAddressId: pinnedAddress?.id || null,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Keep defaultAddress in sync with pinned
    if (pinnedAddress) {
      updateData.defaultAddress = {
        street: pinnedAddress.street,
        city: pinnedAddress.city,
        state: pinnedAddress.state,
        postalCode: pinnedAddress.postalCode,
        country: pinnedAddress.country,
        instructions: pinnedAddress.instructions,
      };
    }

    await customerRef.update(updateData);

    return NextResponse.json({
      address: updatedAddresses[addressIndex],
      addresses: updatedAddresses,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE - Remove an address
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(decodedToken.uid);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const existingAddresses: SavedAddress[] = customerDoc.data()?.savedAddresses || [];
    const addressToDelete = existingAddresses.find((a) => a.id === addressId);

    if (!addressToDelete) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    let updatedAddresses = existingAddresses.filter((a) => a.id !== addressId);

    // If we deleted the pinned address, pin the first remaining one
    if (addressToDelete.isPinned && updatedAddresses.length > 0) {
      updatedAddresses[0].isPinned = true;
    }

    const pinnedAddress = updatedAddresses.find((a) => a.isPinned);

    const updateData: Record<string, unknown> = {
      savedAddresses: updatedAddresses,
      pinnedAddressId: pinnedAddress?.id || null,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (pinnedAddress) {
      updateData.defaultAddress = {
        street: pinnedAddress.street,
        city: pinnedAddress.city,
        state: pinnedAddress.state,
        postalCode: pinnedAddress.postalCode,
        country: pinnedAddress.country,
        instructions: pinnedAddress.instructions,
      };
    } else {
      updateData.defaultAddress = null;
    }

    await customerRef.update(updateData);

    return NextResponse.json({ success: true, addresses: updatedAddresses });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}