import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase/firebaseConfig';
import HomeNavbar from './components/HomeNavbar';
import Hero from './components/Hero';
import EventsSection from './components/EventsSection';
import SecretariesSection from './components/SecretariesSection';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import EventDetailPage from './components/EventDetailPage';
import ScrollProgress from './components/ScrollProgress';
import useScrollReveal from './hooks/useScrollReveal';

import { filterValidEvents, checkMediaValidity } from './utils/mediaValidity';

// admin pages
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminUpload from './components/admin/AdminUpload';
import AdminSecretaries from './components/admin/AdminSecretaries';
import AdminIntake from './components/admin/AdminIntake';
import ProtectedRoute from './components/admin/ProtectedRoute';

// landing page
function LandingPage({ events, secretaries }) {
  const [detailModalMode, setDetailModalMode] = useState(null);
  const location = useLocation();

  // activate scroll-triggered entrance animations
  useScrollReveal([events]);

  // automatically scroll to corresponding home section when arriving from an events tab / page
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 120);
      return () => clearTimeout(timer);
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash, events.length]);

  const handleOpenDetailedView = (mode) => {
    setDetailModalMode(mode);
  };

  const handleCloseDetailModal = () => {
    setDetailModalMode(null);
  };

  return (
    <div className="app-wrapper">
      <HomeNavbar />
      
      <main>
        <Hero />
        
        <EventsSection 
          events={events} 
          onOpenDetailedView={handleOpenDetailedView}
        />
        
        <SecretariesSection 
          secretaries={secretaries} 
          onOpenDetailedView={handleOpenDetailedView}
        />
      </main>

      <Footer />

      {/* cool modals */}
      <DetailModal 
        isOpen={Boolean(detailModalMode)}
        mode={detailModalMode}
        onClose={handleCloseDetailModal}
        events={events}
        secretaries={secretaries}
      />
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [secretaries, setSecretaries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const eventGroups = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const key = (data.eventName || data.title || 'Untitled Event').trim();

        if (!eventGroups[key]) {
          let dateStr = data.eventDate || data.date || '';
          if (!dateStr && data.createdAt) {
            const dt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }

          eventGroups[key] = {
            id: key,
            title: key,
            date: dateStr || 'Recent Archive',
            description: data.eventDescription || data.description || 'Live musical performance and campus archive.',
            category: 'Live Showcase',
            tag: 'Cloudinary Archive',
            mediaList: [],
            createdAtMillis: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : Date.now()) : Date.now()
          };
        }

        if (data.eventDate && (!eventGroups[key].date || eventGroups[key].date === 'Recent Archive')){
          eventGroups[key].date = data.eventDate;
        }
    if (data.eventDescription && (!eventGroups[key].description || eventGroups[key].description === 'Live musical performance and campus archive.')) {
          eventGroups[key].description = data.eventDescription;
        }

        // collect from medialist array, a unified event schema
    if (data.mediaList && Array.isArray(data.mediaList)) {
          data.mediaList.forEach((m, i) => {
            if (m && m.url && !eventGroups[key].mediaList.some(existing => existing.url === m.url)) {
              eventGroups[key].mediaList.push({
                id: `${doc.id}-${i}`,
                url: m.url,
                type: m.type || 'image'
              });
            }
          });
        }

        // collect single media url if present
        if (data.mediaUrl && !eventGroups[key].mediaList.some(existing => existing.url === data.mediaUrl)) {
          eventGroups[key].mediaList.push({
            id: doc.id,
            url: data.mediaUrl,
            type: data.mediaType || 'image'
          });
        }
      });

      // events are sorted based on the time descending
      const rawEventList = Object.values(eventGroups).sort((a, b) => b.createdAtMillis - a.createdAtMillis);

      filterValidEvents(rawEventList).then((validEvents) => {
        setEvents(validEvents);
        setLoading(false);
      });

      // automatically prune dead documents from firestore if all their cloudinary assets were deleted
      snapshot.docs.forEach(async (docSnap) => {
        const d = docSnap.data();
        const urlsToTest = [];
        if (d.mediaUrl) urlsToTest.push({ url: d.mediaUrl, type: d.mediaType || 'image' });
        if (d.mediaList && Array.isArray(d.mediaList)) {
          d.mediaList.forEach(m => { if (m?.url) urlsToTest.push({ url: m.url, type: m.type || 'image' }); });
        }
        if (urlsToTest.length > 0) {
          const results = await Promise.all(urlsToTest.map(item => checkMediaValidity(item.url, item.type)));
          const hasAnyLive = results.some(valid => valid);
          if (!hasAnyLive) {
            try {
              await deleteDoc(doc(db, 'events', docSnap.id));
            } catch (err) {
              console.warn('Could not auto-prune orphaned document:', err);
            }
          }
        }
      });
    }, (error) => {
      console.error('Error fetching events from Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'secretaries'), (snapshot) => {
      const grouped = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const yr = data.year || 'Unknown';
        if (!grouped[yr]) grouped[yr] = [];
        grouped[yr].push({
          id: docSnap.id,
          name: data.name || '',
          role: data.role || 'Secretary',
          image: data.image || '',
          icon: data.icon || '🎵',
        });
      });
      setSecretaries(grouped);
    }, (err) => {
      console.error('Error fetching secretaries:', err);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <ScrollProgress />
      <Routes>
        {/* landing page */}
        <Route path="/" element={<LandingPage events={events} secretaries={secretaries} />} />

        {/* event details page */}
        <Route path="/events/:eventId" element={<EventDetailPage events={events} loading={loading} />} />

        {/* admin login */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* protected admin routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/upload" element={<AdminUpload />} />
            <Route path="/admin/secretaries" element={<AdminSecretaries />} />
            <Route path="/admin/intake" element={<AdminIntake />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
