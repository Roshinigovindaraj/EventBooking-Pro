import { apiRequest } from './apiClient.js';

export const getWishlistOwner = (user) => {
  if (!user) return '';
  return encodeURIComponent(user._id || user.id || user.email?.toLowerCase() || '');
};

export const getItemIdentifier = (item) => {
  if (!item) return '';
  return String(item.id || item._id || item.backendId || item.name || '').trim();
};

export const isItemWishlisted = (kind, id, user) => {
  if (!id || !user) return false;
  const targetId = String(id).trim();
  const currentOwner = getWishlistOwner(user);
  if (!currentOwner) return false;
  const userKey = `eventoria:wishlist:${currentOwner}:${kind}:${targetId}`;
  return Boolean(localStorage.getItem(userKey));
};

export const toggleWishlistItem = async (kind, rawItem, user) => {
  if (!user) return false;
  const itemId = getItemIdentifier(rawItem);
  if (!itemId) return false;

  const currentLiked = isItemWishlisted(kind, itemId, user);
  const nextLiked = !currentLiked;
  const owner = getWishlistOwner(user);
  const userKey = `eventoria:wishlist:${owner}:${kind}:${itemId}`;

  if (nextLiked) {
    const payload = {
      ...rawItem,
      id: rawItem.id || rawItem._id || itemId,
      _id: rawItem._id || rawItem.id || itemId,
      kind,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(userKey, JSON.stringify(payload));
    } catch {
      // Ignore
    }

    // Sync to backend database
    if (/^[a-f\d]{24}$/i.test(itemId)) {
      apiRequest('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ itemType: kind, itemId }),
      }).catch((err) => {
        console.warn('Could not sync wishlist addition to backend:', err);
      });
    }
  } else {
    try {
      localStorage.removeItem(userKey);
    } catch {
      // Ignore
    }

    if (/^[a-f\d]{24}$/i.test(itemId)) {
      apiRequest(`/wishlist/${itemId}`, { method: 'DELETE' }).catch((err) => {
        console.warn('Could not sync wishlist removal to backend:', err);
      });
    }
  }

  // Notify listeners across open pages
  window.dispatchEvent(
    new CustomEvent('eventoria:wishlist-updated', {
      detail: { kind, id: itemId, liked: nextLiked, item: rawItem },
    })
  );

  return nextLiked;
};

export const removeWishlistItem = async (item, user) => {
  if (!user) return;
  const kind = item.kind || (item.guests !== undefined ? 'venue' : 'event');
  const itemId = getItemIdentifier(item);
  const owner = getWishlistOwner(user);

  try {
    if (item.key) localStorage.removeItem(`eventoria:wishlist:${owner}:${item.key}`);
    if (itemId) localStorage.removeItem(`eventoria:wishlist:${owner}:${kind}:${itemId}`);
  } catch {
    // Ignore
  }

  const deleteId = item.backendWishlistId || (/^[a-f\d]{24}$/i.test(itemId) ? itemId : null);
  if (deleteId) {
    apiRequest(`/wishlist/${deleteId}`, { method: 'DELETE' }).catch((err) => {
      console.warn('Could not delete wishlist item from server:', err);
    });
  }

  window.dispatchEvent(
    new CustomEvent('eventoria:wishlist-updated', {
      detail: { kind, id: itemId, liked: false, item },
    })
  );
};

export const loadAllWishlist = async (user) => {
  if (!user) return [];
  const currentOwner = getWishlistOwner(user);
  if (!currentOwner) return [];
  const prefix = `eventoria:wishlist:${currentOwner}:`;

  const itemsMap = new Map();

  // 1. Collect from user local storage
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const subKey = key.slice(prefix.length);
      const val = localStorage.getItem(key);
      if (!val || val === '0') continue;
      try {
        const parsed = JSON.parse(val);
        if (parsed && (parsed.title || parsed.name)) {
          const kind = subKey.startsWith('venue') ? 'venue' : 'event';
          const id = getItemIdentifier(parsed);
          const compositeKey = `${kind}:${id}`;
          itemsMap.set(compositeKey, {
            ...parsed,
            id: parsed.id || parsed._id || id,
            kind,
            key: subKey,
          });
        }
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore
  }

  // 2. Fetch backend items
  try {
    const res = await apiRequest('/wishlist');
    const backendItems = res?.items || [];
    for (const entry of backendItems) {
      if (!entry.item) continue;
      const kind = entry.itemType === 'venue' ? 'venue' : 'event';
      const doc = entry.item;
      const id = doc._id || doc.id;
      const compositeKey = `${kind}:${id}`;

      let itemData;
      if (kind === 'event') {
        const start = new Date(doc.startsAt);
        const end = new Date(doc.endsAt);
        const prices = (doc.ticketTypes || []).map((t) => t.priceMinor / 100);
        const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.valueOf());
        const formatTime = (d) => (isValidDate(d) ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
        itemData = {
          id,
          _id: id,
          backendWishlistId: entry._id,
          title: doc.title || 'Untitled Event',
          image: doc.images?.[0] || '/images/hero1.png',
          day: isValidDate(start) ? String(start.getDate()).padStart(2, '0') : '01',
          month: isValidDate(start) ? start.toLocaleString('en-IN', { month: 'short' }).toUpperCase() : 'EVENT',
          venue: doc.venueName || doc.location?.address || 'Venue to be announced',
          city: doc.location?.city || '',
          time: isValidDate(start) ? `${formatTime(start)} - ${formatTime(end)}` : 'Time to be announced',
          price: `₹ ${(prices.length ? Math.min(...prices) : 0).toLocaleString('en-IN')}`,
          kind: 'event',
          key: `event:${id}`,
        };
      } else {
        itemData = {
          id,
          _id: id,
          backendWishlistId: entry._id,
          name: doc.name || 'Venue',
          image: doc.images?.[0] || '/images/hero-wedding.png',
          city: doc.location?.city || '',
          price: doc.priceMinorPerHour ? Math.round((doc.priceMinorPerHour / 100) * 8) : 50000,
          guests: doc.capacity || 500,
          rating: '4.8',
          reviews: '12',
          type: doc.type || 'Banquet Hall',
          kind: 'venue',
          key: `venue:${id}`,
        };
      }

      const existing = itemsMap.get(compositeKey);
      itemsMap.set(compositeKey, { ...itemData, ...existing, backendWishlistId: entry._id });

      try {
        localStorage.setItem(`eventoria:wishlist:${currentOwner}:${kind}:${id}`, JSON.stringify(itemData));
      } catch {
        // Ignore
      }
    }
  } catch (err) {
    console.warn('Could not fetch server wishlist items:', err);
  }

  return Array.from(itemsMap.values());
};
