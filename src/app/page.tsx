"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function CinematicLanding() {
  useEffect(() => {
    const stage = document.getElementById('stage');
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    const menuLinks = document.querySelectorAll('.menu-link');

    function toggleMenu() {
      if (!stage || !burger || !menu) return;
      const isOpen = stage.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function closeMenu() {
      if (!stage || !burger || !menu) return;
      stage.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    }

    if (burger) burger.addEventListener('click', toggleMenu);
    menuLinks.forEach(link => link.addEventListener('click', closeMenu));

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage?.classList.contains('is-open')) closeMenu();
    };
    
    const handleResize = () => {
      if (window.innerWidth / window.innerHeight > 1.1 && stage?.classList.contains('is-open')) {
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleResize);

    return () => {
      if (burger) burger.removeEventListener('click', toggleMenu);
      menuLinks.forEach(link => link.removeEventListener('click', closeMenu));
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --ink: #fafafa;
          --muted: #a7a6a6;
          --nav: #b6b5b5;
          --pill: #ffffff;
          --pill-ink: #050505;
          --stage-bg: #050505;
          --u: calc(100vh / 1058);
          --uw: calc(100vw / 1487);
          --h: clamp(var(--u), calc(var(--u) * 0.65 + var(--uw) * 0.35), calc(var(--u) * 1.16));
        }
        @supports (height: 100dvh) { :root { --u: calc(100dvh / 1058); } }

        html, body {
          width: 100%; height: 100%; overflow: hidden;
          background-color: var(--stage-bg) !important;
          margin: 0; padding: 0;
        }

        #stage {
          position: fixed; inset: 0;
          width: 100vw; height: 100vh;
          overflow: hidden; background: var(--stage-bg);
          color: var(--ink);
          font-family: 'Manrope', system-ui, sans-serif;
          z-index: 9999; /* ensure it covers everything */
        }

        .plate { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 1; }
        .plate-video {
          position: absolute; left: 50%; top: calc(1 * var(--u));
          width: calc(1492 * var(--u)); height: calc(1054 * var(--u));
          transform: translateX(calc(-50% - calc(0.5 * var(--u))));
          object-fit: cover; pointer-events: none;
        }

        .plate::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(to bottom, rgba(5,5,5,0) 78.8%, rgba(5,5,5,.23) 79.6%, rgba(5,5,5,.45) 81.4%, rgba(5,5,5,.75) 83.3%, rgba(5,5,5,.84) 85.2%, rgba(5,5,5,.888) 88%, rgba(5,5,5,.905) 91%, rgba(5,5,5,.96) 95%, #050505 100%),
            linear-gradient(to right, #050505 calc(50% - calc(746 * var(--u))), transparent calc(50% - calc(676 * var(--u))), transparent calc(50% + calc(676 * var(--u))), #050505 calc(50% + calc(746 * var(--u))));
        }

        header.topbar { position: absolute; inset: 0 0 auto 0; height: calc(100 * var(--u)); z-index: 10; pointer-events: auto; }
        
        .brand { position: absolute; left: calc(75 * var(--u)); top: calc(27 * var(--u)); width: calc(31.5 * var(--u)); height: calc(48.5 * var(--u)); display: block; }
        .brand svg { width: 100%; height: 100%; display: block; }

        nav.links {
          position: absolute; left: 50%; top: calc(51 * var(--u)); transform: translate(-50%, -50%);
          display: flex; align-items: center; gap: calc(24.5 * var(--u));
          font-size: calc(19.0 * var(--u)); font-weight: 400; color: var(--nav); white-space: nowrap;
        }
        nav.links a { transition: color 0.2s ease; text-decoration: none; color: var(--nav); }
        nav.links a:hover { color: var(--ink); }

        .pill-nav {
          position: absolute; right: calc(75.4 * var(--u)); top: calc(27 * var(--u));
          width: calc(175 * var(--u)); height: calc(49 * var(--u));
          background: var(--pill); color: var(--pill-ink); border-radius: 999px;
          font-size: calc(20.6 * var(--u)); font-weight: 500; display: flex; align-items: center; justify-content: center;
          text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .pill-nav:hover { transform: scale(1.02); opacity: 0.95; }
        .pill-nav span { transform: translateY(calc(1 * var(--u))); }

        button.burger { display: none; }

        main.hero { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
        h1.headline {
          position: absolute; left: calc(75.5 * var(--u)); top: calc(230.5 * var(--u));
          font-size: calc(71.6 * var(--h)); line-height: calc(80.5 * var(--h));
          font-weight: 400; letter-spacing: calc(0.3 * var(--h)); color: var(--ink);
          white-space: nowrap; pointer-events: auto; margin: 0;
        }
        h1.headline span { display: block; }

        p.sub {
          position: absolute; left: calc(75.5 * var(--u)); top: calc(230.5 * var(--u) + 189.0 * var(--h));
          font-size: calc(20.7 * var(--h)); line-height: calc(23.5 * var(--h));
          font-weight: 400; word-spacing: calc(1.8 * var(--h)); color: var(--muted);
          pointer-events: auto; margin: 0;
        }
        p.sub span { display: block; white-space: nowrap; }

        .actions { position: absolute; left: 0; top: 0; pointer-events: auto; }
        .pill-cta {
          position: absolute; left: calc(74.9 * var(--u)); top: calc(230.5 * var(--u) + 264.5 * var(--h));
          width: calc(175.6 * var(--h)); height: calc(50 * var(--h));
          background: var(--pill); color: var(--pill-ink); border-radius: 999px;
          font-size: calc(20.6 * var(--h)); font-weight: 500; display: flex; align-items: center; justify-content: center;
          text-decoration: none; transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .pill-cta:hover { transform: scale(1.02); opacity: 0.95; }
        .pill-cta span { transform: translateY(calc(1 * var(--u))); }

        .ghost {
          position: absolute; left: calc(74.9 * var(--u) + 220.6 * var(--h)); top: calc(230.5 * var(--u) + 279.5 * var(--h));
          font-size: calc(20.6 * var(--h)); font-weight: 500; letter-spacing: calc(0.12 * var(--h));
          color: #ffffff; text-decoration: none; white-space: nowrap; transition: opacity 0.2s ease;
        }
        .ghost:hover { opacity: 0.8; }

        nav.menu { display: none; }

        @media (prefers-reduced-motion: no-preference) {
          @keyframes rise { from { opacity: 0; transform: translateY(calc(14 * var(--u))); } to { opacity: 1; transform: translateY(0); } }
          @keyframes riseNav { from { opacity: 0; transform: translate(-50%, calc(-50% + calc(14 * var(--u)))); } to { opacity: 1; transform: translate(-50%, -50%); } }
          
          .brand, .pill-nav { animation: rise 0.8s cubic-bezier(.22, 1, .36, 1) both; }
          nav.links { animation: riseNav 0.8s cubic-bezier(.22, 1, .36, 1) both; }
          h1.headline { animation: rise 0.9s cubic-bezier(.22, 1, .36, 1) 0.06s both; }
          p.sub { animation: rise 0.9s cubic-bezier(.22, 1, .36, 1) 0.14s both; }
          .pill-cta, .ghost { animation: rise 0.9s cubic-bezier(.22, 1, .36, 1) 0.22s both; }
        }

        /* Mobile */
        @media (max-aspect-ratio: 11/10) {
          :root { --m: min(calc(100vw / 430), 1.34px); --u: var(--m); --h: var(--m); }
          html, body { overflow-y: auto; overflow-x: hidden; height: auto; min-height: 100%; }
          #stage { position: relative; min-height: 100vh; height: auto; display: flex; flex-direction: column; padding: calc(24 * var(--u)); overflow-y: auto; }
          
          .plate { position: fixed; inset: 0; width: 100vw; height: 100vh; }
          .plate-video { inset: 0; width: 100%; height: 100%; transform: none; object-position: 43% center; }
          
          .plate::after {
            background-image:
              linear-gradient(to right, rgba(5,5,5,.86) 0%, rgba(5,5,5,.66) 42%, rgba(5,5,5,.20) 78%, rgba(5,5,5,.10) 100%),
              linear-gradient(to bottom, rgba(5,5,5,.72) 0%, rgba(5,5,5,.34) 24%, rgba(5,5,5,.34) 56%, rgba(5,5,5,.80) 82%, rgba(5,5,5,.97) 94%, #050505 100%);
          }

          header.topbar { position: relative; inset: auto; height: auto; display: flex; align-items: center; justify-content: space-between; width: 100%; }
          .brand { position: static; width: calc(28 * var(--u)); height: calc(43 * var(--u)); }
          nav.links, .pill-nav { display: none; }
          
          button.burger {
            display: flex; flex-direction: column; justify-content: center; align-items: center; gap: calc(5 * var(--u));
            width: calc(48 * var(--u)); height: calc(48 * var(--u)); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
            backdrop-filter: blur(16px); border-radius: 999px; cursor: pointer; z-index: 100; pointer-events: auto;
          }
          button.burger i { display: block; width: calc(18 * var(--u)); height: calc(1.6 * var(--u)); background: #fafafa; transition: transform 0.3s, opacity 0.3s; }
          #stage.is-open button.burger i:nth-child(1) { transform: translateY(calc(3.3 * var(--u))) rotate(45deg); }
          #stage.is-open button.burger i:nth-child(2) { transform: translateY(calc(-3.3 * var(--u))) rotate(-45deg); }

          nav.menu {
            display: flex; position: fixed; inset: 0; background: rgba(5,5,5,0.95); backdrop-filter: blur(24px); z-index: 90;
            opacity: 0; visibility: hidden; transition: opacity 0.4s, visibility 0.4s;
            padding: calc(100 * var(--u)) calc(30 * var(--u)) calc(40 * var(--u)); flex-direction: column; justify-content: space-between;
          }
          #stage.is-open nav.menu { opacity: 1; visibility: visible; }
          
          .menu-eyebrow { font-size: calc(13 * var(--u)); color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: calc(24 * var(--u)); }
          .menu-list { list-style: none; display: flex; flex-direction: column; gap: calc(20 * var(--u)); padding: 0; }
          .menu-list a { font-size: calc(31 * var(--u)); font-weight: 500; color: var(--ink); text-decoration: none; display: flex; justify-content: space-between; }
          .menu-list a::after { content: "→"; font-size: calc(20 * var(--u)); color: var(--muted); }
          
          .menu-foot { display: flex; flex-direction: column; gap: calc(16 * var(--u)); margin-top: calc(30 * var(--u)); }
          .menu-foot .pill { width: 100%; height: calc(52 * var(--u)); background: var(--pill); color: var(--pill-ink); border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: calc(18 * var(--u)); font-weight: 600; text-decoration: none; }
          .menu-foot .ghost { position: static; text-align: center; font-size: calc(16 * var(--u)); color: var(--muted); }

          main.hero { position: relative; inset: auto; margin-top: calc(60 * var(--u)); margin-bottom: calc(60 * var(--u)); }
          h1.headline { position: static; font-size: calc(44 * var(--u)); line-height: calc(50 * var(--u)); white-space: normal; }
          p.sub { position: static; margin-top: calc(20 * var(--u)); font-size: calc(17 * var(--u)); line-height: calc(24 * var(--u)); white-space: normal; }
          p.sub span { white-space: normal; display: inline; }
          
          .actions { position: static; margin-top: calc(36 * var(--u)); display: flex; flex-direction: column; gap: calc(18 * var(--u)); }
          .pill-cta { position: static; width: 100%; max-width: calc(280 * var(--u)); height: calc(52 * var(--u)); font-size: calc(18 * var(--u)); }
          .ghost { position: static; font-size: calc(17 * var(--u)); }
        }
      `}} />
      
      <div id="stage">
        <div className="plate" aria-hidden="true">
          <video className="plate-video" autoPlay muted loop playsInline preload="auto">
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_112712_da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4" type="video/mp4" />
          </video>
        </div>

        <header className="topbar">
          <Link href="/" className="brand" aria-label="Home">
            <svg viewBox="0 0 31.5 48.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bg1" x1="8" y1="0" x2="34.1" y2="28.9" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9e9e9e"/>
                  <stop offset="0.28" stopColor="#a6a6a6"/>
                  <stop offset="0.34" stopColor="#a3a3a3"/>
                  <stop offset="0.40" stopColor="#3a3a3a"/>
                  <stop offset="0.55" stopColor="#414141"/>
                  <stop offset="0.60" stopColor="#7a7a7a"/>
                  <stop offset="0.68" stopColor="#8e8e8e"/>
                  <stop offset="0.80" stopColor="#a9a9a9"/>
                  <stop offset="0.95" stopColor="#c4c4c4"/>
                  <stop offset="1" stopColor="#cccccc"/>
                </linearGradient>
              </defs>
              <path d="M21.5 0 L21.5 19.5 L31.5 19.5 L31.5 29 L10 48.5 L10 28.5 L0.5 28.5 L0.5 18.5 Z" fill="url(#bg1)"/>
              <rect x="0.5" y="18.5" width="9" height="10" fill="#fdfdfd"/>
              <rect x="22" y="19.5" width="9.5" height="9.5" fill="#fdfdfd"/>
            </svg>
          </Link>

          <nav className="links" aria-label="Primary">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/catalog">Catalog</Link>
            <Link href="/audit">Audit Trail</Link>
          </nav>

          <Link href="/chat" className="pill-nav">
            <span>Talk to Carter</span>
          </Link>

          <button className="burger" id="burger" aria-label="Toggle Menu" aria-expanded="false">
            <i />
            <i />
          </button>
        </header>

        <nav className="menu" id="menu" aria-hidden="true">
          <div className="menu-inner">
            <p className="menu-eyebrow">Menu</p>
            <ul className="menu-list">
              <li><Link href="/dashboard" className="menu-link">Dashboard</Link></li>
              <li><Link href="/catalog" className="menu-link">Catalog</Link></li>
              <li><Link href="/audit" className="menu-link">Audit Trail</Link></li>
            </ul>
            <div className="menu-foot">
              <Link href="/chat" className="pill"><span>Talk to Carter</span></Link>
              <Link href="/dashboard" className="ghost">View Platform</Link>
            </div>
          </div>
        </nav>

        <main className="hero">
          <h1 className="headline">
            <span>Agent Carter</span>
            <span>Intelligence Layer</span>
          </h1>
          <p className="sub">
            <span>The autonomous checkout agent protecting margins,</span>
            <span>boosting AOV, and securing Razorpay revenue.</span>
          </p>
          <div className="actions">
            <Link href="/chat" className="pill-cta">
              <span>Initialize Agent</span>
            </Link>
            <Link href="/dashboard" className="ghost">
              Enter Dashboard
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
