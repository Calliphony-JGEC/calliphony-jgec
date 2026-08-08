import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => { setScrolled(window.scrollY > 60)};
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (e, targetId) => {
        e.preventDefault();
        if (location.pathname !== '/admin') {
            navigate(targetId ? `/#${targetId}` : '/');
        } else {
            if (!targetId) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    };
    const handleAdminNavClick = (e, targetId) => {
        e.preventDefault();
        const targetPath = `/admin/${targetId}`;
        if (location.pathname !== targetPath){
            navigate(targetPath);
        }   
    }
    return (
        <header className={`AdminNavbar ${scrolled ? 'AdminNavbar--scrolled' : ''}`}>
            <nav className="AdminNavbar-container">
                <a href="/" onClick={(e) => handleNavClick(e, '')} className ="nav-logo">
                <span>/ calliphony</span>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                <div className="eq-bar"></div>
                </a>

                <ul className="nav-links">
                    <li><a href="/admin/upload" onClick={(e) => handleAdminNavClick(e, 'upload')} className="nav-link-item"><span>Upload</span></a></li>
                    <li><a href="/admin/secretaries" onClick={(e)=>handleAdminNavClick(e, 'secretaries')} className="nav-link-item"><span>Secretaries</span></a></li>
                    <li><a href="/admin/intake" onClick={(e)=>handleAdminNavClick(e, 'intake')} className="nav-link-item"><span>Intake</span></a></li>
                </ul>

            
            </nav>
        </header>
    )
}

