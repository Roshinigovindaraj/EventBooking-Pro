import React from "react";
import { Link } from "react-router-dom";

const footerGroups = [
  ["Quick Links", "Home", "Events", "Venues", "Organize Event", "List Your Venue"],
  ["Support", "Help Center", "Contact Us", "Booking Guide", "Terms & Conditions", "Privacy Policy"],
  ["For Organizers", "Create an Event", "Manage Events", "Pricing", "Organizer Guide"],
  ["For Venue Owners", "List Your Venue", "Venue Partner Program", "Commission & Fees", "Venue Guidelines"],
];

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap footer-grid">
        <div>
          <Link className="logo light" to="/">
            <span className="logo-mark">✦</span>
            <span>
              <b>Eventoria</b>
              <small>Events • Venues • Every Moment</small>
            </span>
          </Link>
          <p>
            Discover amazing events and venues for every occasion. Making
            celebrations easier, one booking at a time.
          </p>
          <div className="social">
            <span>f</span><span>◎</span><span>𝕏</span><span>▶</span><span>in</span>
          </div>
        </div>
        {footerGroups.map(([title, ...links]) => (
          <div className="footer-links" key={title}>
            <b>{title}</b>
            {links.map((label) => (
              <a href="#" key={label}>{label}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="copyright wrap">
        <span>© 2026 Eventoria. All rights reserved.</span>
        <span>Made with <em>♥</em> for unforgettable moments</span>
      </div>
    </footer>
  );
}
