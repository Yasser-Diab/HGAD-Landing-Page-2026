# HGAD – Product Landing Page

A responsive, mobile-first product landing page for **Handasia Group for Architectural Designs (HGAD)**.  
The project showcases HGAD’s aluminium systems, façade engineering services, projects portfolio, and includes a fully functional contact form integrated with EmailJS.

---

## Contents
- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Contact Form Functionality](#contact-form-functionality)
- [Project Structure](#project-structure)
- [Notes & Limitations](#notes--limitations)
- [Future Enhancements](#future-enhancements)
- [Author](#author)

---

## Overview
This landing page was built as part of a practical frontend development journey, focusing on real-world requirements such as responsiveness, user experience, branding consistency, and third-party service integration.  
The design follows a **mobile-first approach**, with desktop styles planned as a future enhancement.

---

## Features
- Mobile-first responsive layout
- Fixed header with smooth scrolling navigation
- Animated metallic gradients using HSLA color model
- Hero section with video background
- Dynamic country → governorate → city selection (API-driven)
- Contact form with EmailJS integration
- Clean semantic HTML structure
- CSS variables for scalable theming

---

## Technologies Used
- HTML5
- CSS3 (Grid, Flexbox, Variables, Animations)
- JavaScript (ES6+, async/await)
- EmailJS (SMTP service integration)
- Public Countries API (countriesnow.space)

---

## Contact Form Functionality
The contact form collects:
- Name
- Email
- Phone number
- Country, Governorate, City
- Project name
- Project message

Form submissions are sent directly to the company email using **EmailJS SMTP service**.

---

## Project Structure

/
├── index.html
├── styles.css
├── media/
│   ├── HGAD-Dark.png
│   └── HGAD-compressed-header-logo.jpg
└── README.md


## Notes & Limitations

- Desktop-specific styles are not yet implemented.
- API availability depends on the public countries API uptime (for now).


## Future Enhancements

- Desktop and large-screen layouts
- Backend integration for real file uploads
- Improved accessibility (ARIA roles)
- Performance optimizations
- SEO enhancements
- Dark/light theme toggle

## Author

### Yasser Diab
- Frontend Developer in progress | Full-Stack Journey
### Handasia Group for Architectural Designs (HGAD)