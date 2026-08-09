import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomeNavbar from './components/HomeNavbar';
import Hero from './components/Hero';
import EventsSection from './components/EventsSection';
import SecretariesSection from './components/SecretariesSection';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import EventDetailPage from './components/EventDetailPage';
import ScrollProgress from './components/ScrollProgress';
import useScrollReveal from './hooks/useScrollReveal';
import { api } from './api/client';
import { filterValidEvents } from './utils/mediaValidity';
import { orderMediaWithThumbnail } from './utils/mediaThumb';

import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminUpload from './components/admin/AdminUpload';
import AdminSecretaries from './components/admin/AdminSecretaries';
import AdminIntake from './components/admin/AdminIntake';
import ProtectedRoute from './components/admin/ProtectedRoute';

function LandingPage({ events, secretaries }) {
  const [detailModalMode, setDetailModalMode] = useState(null);
  const location = useLocation();

  useScrollReveal([events]);

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

        <EventsSection events={events} onOpenDetailedView={handleOpenDetailedView} />

        <SecretariesSection secretaries={secretaries} onOpenDetailedView={handleOpenDetailedView} />
      </main>

      <Footer />

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

function mapEventsForUi(rawEvents) {
  return rawEvents.map((data) => {
    const key = (data.eventName || data.title || 'Untitled Event').trim();
    let dateStr = data.eventDate || data.date || '';
    if (!dateStr && data.createdAt) {
      const dt = new Date(data.createdAt);
      dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const mediaList = (Array.isArray(data.mediaList) ? data.mediaList : []).map((m, i) => ({
      id: `${data.id || data.docId}-${i}`,
      url: m.url,
      type: m.type || 'image',
      publicId: m.publicId || '',
      resourceType: m.resourceType || (m.type === 'video' ? 'video' : 'image'),
      thumbnailUrl: m.thumbnailUrl || '',
    }));

    const draft = {
      id: key,
      docId: data.id || data.docId,
      title: key,
      date: dateStr || 'Recent Archive',
      description:
        data.eventDescription || data.description || 'Live musical performance and campus archive.',
      category: 'Live Showcase',
      tag: 'Cloudinary Archive',
      mediaList,
      thumbnailUrl: data.thumbnailUrl || mediaList[0]?.url || '',
      createdAtMillis: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    };

    // Normalize order so cover is always first for every UI surface
    const ordered = orderMediaWithThumbnail(draft);
    return {
      ...draft,
      mediaList: ordered.map((m, i) => ({ ...m, id: `${draft.docId}-${i}` })),
      thumbnailUrl: ordered[0]?.url || draft.thumbnailUrl,
    };
  });
}
export default function App() {
  const [events, setEvents] = useState([]);
  const [secretaries, setSecretaries] = useState({});
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const data = await api.getEvents();
        const mapped = mapEventsForUi(data.events || []);
        const validEvents = await filterValidEvents(mapped);
        if (!cancelled) {
          setEvents(validEvents);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadSecretaries() {
      try {
        const data = await api.getSecretaries();
        const grouped = {};
        (data.secretaries || []).forEach((item) => {
          const yr = item.year || 'Unknown';
          if (!grouped[yr]) grouped[yr] = [];
          grouped[yr].push({
            id: item.id || item.docId,
            name: item.name || '',
            role: item.role || 'Secretary',
            image: item.image || '',
            icon: item.icon || '🎵',
          });
        });
        if (!cancelled) setSecretaries(grouped);
      } catch (err) {
        console.error('Error fetching secretaries:', err);
      }
    }

    loadSecretaries();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <>
      <ScrollProgress />
      <Routes>
        <Route path="/" element={<LandingPage events={events} secretaries={secretaries} />} />
        <Route path="/events/:eventId" element={<EventDetailPage events={events} loading={loading} />} />
        <Route path="/admin" element={<AdminLogin />} />
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
