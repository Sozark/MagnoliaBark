/**
 * Magnolia Bark Clinic (Wound Consultants) — Accessible Multi-Page Script
 * Handles:
 *  1. Persistent WCAG Text-Size Controls (100%, 112%, 125%) across pages
 *  2. Accessible Services Dropdown Menu (Hover, Click, Escape, Outside-Click & Focus-Out)
 *  3. Accessible Mobile Navigation Drawer (Escape key & focus handling)
 *  4. Accessible Service Filter Tabs + URL Query (?category=...) Deep Linking
 *  5. Accessible Appointment & Referral Form Validation (aria-invalid & live alerts)
 */

(function () {
  "use strict";

  const announcer = document.getElementById("a11y-announcer");

  function announce(message) {
    if (!announcer) return;
    announcer.textContent = "";
    window.setTimeout(function () {
      announcer.textContent = message;
    }, 30);
  }

  /* ------------------------------------------------------------------------
     1. Text Size Controls (Persisted via localStorage)
     ------------------------------------------------------------------------ */
  const fontButtons = document.querySelectorAll("[data-font-size]");

  function applyFontScale(scale, shouldAnnounce) {
    const validScales = ["1", "1.12", "1.25"];
    const normalized = validScales.includes(scale) ? scale : "1";
    document.documentElement.setAttribute("data-font-scale", normalized);

    try {
      window.localStorage.setItem("mb_font_scale", normalized);
    } catch (e) {
      // Ignore storage restrictions in private browsing
    }

    fontButtons.forEach(function (btn) {
      const isMatch = btn.getAttribute("data-font-size") === normalized;
      btn.setAttribute("aria-pressed", isMatch ? "true" : "false");
    });

    if (shouldAnnounce) {
      const labels = {
        "1": "Standard text size (100%) enabled.",
        "1.12": "Large text size (112%) enabled.",
        "1.25": "Extra large text size (125%) enabled."
      };
      announce(labels[normalized]);
    }
  }

  const savedScale = document.documentElement.getAttribute("data-font-scale") || "1";
  applyFontScale(savedScale, false);

  fontButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const selectedScale = btn.getAttribute("data-font-size");
      applyFontScale(selectedScale, true);
    });
  });

  /* ------------------------------------------------------------------------
     2. Accessible Services Dropdown Menu in Hero Bar
     ------------------------------------------------------------------------ */
  const dropdownWrapper = document.querySelector(".primary-nav__item--dropdown");
  const dropdownToggle = document.querySelector(".nav-dropdown__toggle");
  const dropdownMenu = document.getElementById("services-dropdown-menu");

  function setDropdownOpen(isOpen, shouldAnnounce) {
    if (!dropdownToggle || !dropdownMenu) return;
    dropdownToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    dropdownMenu.hidden = !isOpen;
    if (shouldAnnounce) {
      announce(isOpen ? "Clinical services submenu expanded." : "Clinical services submenu collapsed.");
    }
  }

  if (dropdownWrapper && dropdownToggle && dropdownMenu) {
    // Toggle on click
    dropdownToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      const isExpanded = dropdownToggle.getAttribute("aria-expanded") === "true";
      setDropdownOpen(!isExpanded, true);
    });

    // Desktop hover support (with smooth mouseenter / mouseleave)
    dropdownWrapper.addEventListener("mouseenter", function () {
      if (window.innerWidth > 860) {
        setDropdownOpen(true, false);
      }
    });

    dropdownWrapper.addEventListener("mouseleave", function () {
      if (window.innerWidth > 860) {
        setDropdownOpen(false, false);
      }
    });

    // Keyboard navigation inside dropdown menu
    dropdownMenu.addEventListener("keydown", function (event) {
      const items = Array.from(dropdownMenu.querySelectorAll("a"));
      const currentIndex = items.indexOf(document.activeElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setDropdownOpen(false, true);
        dropdownToggle.focus();
      }
    });

    // ArrowDown from toggle button focuses first submenu item
    dropdownToggle.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setDropdownOpen(true, true);
        const firstItem = dropdownMenu.querySelector("a");
        if (firstItem) firstItem.focus();
      } else if (event.key === "Escape") {
        setDropdownOpen(false, true);
      }
    });

    // Close when clicking outside
    document.addEventListener("click", function (event) {
      if (!dropdownWrapper.contains(event.target) && !dropdownMenu.hidden) {
        setDropdownOpen(false, false);
      }
    });

    // Close when focus leaves the dropdown completely
    dropdownWrapper.addEventListener("focusout", function (event) {
      window.setTimeout(function () {
        if (!dropdownWrapper.contains(document.activeElement) && !dropdownMenu.hidden) {
          setDropdownOpen(false, false);
        }
      }, 10);
    });
  }

  /* ------------------------------------------------------------------------
     3. Mobile Navigation Drawer
     ------------------------------------------------------------------------ */
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const primaryNav = document.getElementById("primary-nav");

  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", function () {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      const nextState = !isExpanded;
      menuToggle.setAttribute("aria-expanded", nextState ? "true" : "false");
      primaryNav.classList.toggle("is-open", nextState);
      announce(nextState ? "Navigation menu expanded." : "Navigation menu collapsed.");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (dropdownMenu && !dropdownMenu.hidden) {
          setDropdownOpen(false, true);
          if (dropdownToggle) dropdownToggle.focus();
          return;
        }
        if (primaryNav.classList.contains("is-open")) {
          menuToggle.setAttribute("aria-expanded", "false");
          primaryNav.classList.remove("is-open");
          menuToggle.focus();
          announce("Navigation menu closed.");
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     4. Services Page Filter Tabs & Deep-Link Support
     ------------------------------------------------------------------------ */
  const serviceTabs = document.querySelectorAll('[role="tab"][data-category]');
  const serviceCards = document.querySelectorAll("[data-service-category]");

  if (serviceTabs.length > 0 && serviceCards.length > 0) {
    function selectServiceCategory(category, moveFocus, shouldAnnounce) {
      let matchedTab = null;

      serviceTabs.forEach(function (tab) {
        const isSelected = tab.getAttribute("data-category") === category;
        tab.setAttribute("aria-selected", isSelected ? "true" : "false");
        tab.setAttribute("tabindex", isSelected ? "0" : "-1");
        if (isSelected) {
          matchedTab = tab;
        }
      });

      if (!matchedTab) {
        category = "all";
        serviceTabs.forEach(function (tab) {
          const isAll = tab.getAttribute("data-category") === "all";
          tab.setAttribute("aria-selected", isAll ? "true" : "false");
          tab.setAttribute("tabindex", isAll ? "0" : "-1");
          if (isAll) matchedTab = tab;
        });
      }

      let visibleCount = 0;
      serviceCards.forEach(function (card) {
        const cardCat = card.getAttribute("data-service-category");
        const show = category === "all" || cardCat === category;
        card.hidden = !show;
        if (show) visibleCount++;
      });

      if (moveFocus && matchedTab) {
        matchedTab.focus();
      }

      if (shouldAnnounce && matchedTab) {
        announce(
          "Showing " +
            visibleCount +
            " clinical service" +
            (visibleCount === 1 ? "" : "s") +
            " under " +
            matchedTab.textContent.trim() +
            "."
        );
      }
    }

    serviceTabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        const cat = tab.getAttribute("data-category");
        selectServiceCategory(cat, false, true);
      });

      tab.addEventListener("keydown", function (event) {
        let nextIndex = null;
        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % serviceTabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + serviceTabs.length) % serviceTabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = serviceTabs.length - 1;
        }

        if (nextIndex !== null) {
          event.preventDefault();
          const nextTab = serviceTabs[nextIndex];
          selectServiceCategory(nextTab.getAttribute("data-category"), true, true);
        }
      });
    });

    const params = new URLSearchParams(window.location.search);
    const queryCat = params.get("category");
    const hashCat = window.location.hash ? window.location.hash.replace("#", "") : "";
    const validCategories = ["all", "wound", "primary", "cognitive", "ostomy", "home"];

    if (queryCat && validCategories.includes(queryCat)) {
      selectServiceCategory(queryCat, false, false);
    } else if (hashCat && validCategories.includes(hashCat)) {
      selectServiceCategory(hashCat, false, false);
    }
  }

  /* ------------------------------------------------------------------------
     5. Accessible Appointment & Referral Form Validation (Contact Page)
     ------------------------------------------------------------------------ */
  const appointmentForm = document.getElementById("appointment-form");

  if (appointmentForm) {
    const errorSummary = document.getElementById("form-error-summary");
    const errorList = document.getElementById("form-error-list");
    const successBanner = document.getElementById("form-success-banner");

    // Pre-select service from URL query (?service=wound) if present
    const contactParams = new URLSearchParams(window.location.search);
    const preselectService = contactParams.get("service");
    const serviceSelect = document.getElementById("service-needed");
    if (preselectService && serviceSelect) {
      serviceSelect.value = preselectService;
    }

    function setFieldError(inputId, errorId, message) {
      const input = document.getElementById(inputId);
      const errorEl = document.getElementById(errorId);
      if (!input || !errorEl) return;

      if (message) {
        input.setAttribute("aria-invalid", "true");
        errorEl.textContent = message;
      } else {
        input.removeAttribute("aria-invalid");
        errorEl.textContent = "";
      }
    }

    appointmentForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const fullName = document.getElementById("full-name");
      const phone = document.getElementById("phone");
      const email = document.getElementById("email");
      const service = document.getElementById("service-needed");
      const careSetting = document.getElementById("care-setting");

      const errors = [];

      if (!fullName.value.trim()) {
        setFieldError("full-name", "error-full-name", "Please enter the patient or referrer full name.");
        errors.push({ id: "full-name", text: "Full Name is required." });
      } else {
        setFieldError("full-name", "error-full-name", "");
      }

      const digitsOnly = phone.value.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        setFieldError("phone", "error-phone", "Please enter a valid 10-digit telephone number.");
        errors.push({ id: "phone", text: "Valid 10-digit Phone Number is required." });
      } else {
        setFieldError("phone", "error-phone", "");
      }

      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        setFieldError("email", "error-email", "Please enter a valid email address (e.g., name@example.com).");
        errors.push({ id: "email", text: "Email Address format is invalid." });
      } else {
        setFieldError("email", "error-email", "");
      }

      if (!service.value) {
        setFieldError("service-needed", "error-service-needed", "Please select a primary clinical service.");
        errors.push({ id: "service-needed", text: "Primary Service Needed is required." });
      } else {
        setFieldError("service-needed", "error-service-needed", "");
      }

      if (!careSetting.value) {
        setFieldError("care-setting", "error-care-setting", "Please select In-Clinic or Home-Based Care.");
        errors.push({ id: "care-setting", text: "Preferred Care Setting is required." });
      } else {
        setFieldError("care-setting", "error-care-setting", "");
      }

      if (errors.length > 0) {
        successBanner.hidden = true;
        errorList.innerHTML = "";
        errors.forEach(function (err) {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = "#" + err.id;
          link.textContent = err.text;
          link.addEventListener("click", function (e) {
            e.preventDefault();
            document.getElementById(err.id).focus();
          });
          li.appendChild(link);
          errorList.appendChild(li);
        });

        errorSummary.hidden = false;
        errorSummary.focus();
        announce("Form submission has " + errors.length + " validation errors. Please review the error summary.");
        return;
      }

      errorSummary.hidden = true;
      successBanner.hidden = false;
      successBanner.focus();
      announce("Your appointment request has been submitted. Our Algiers clinic coordinator will call you within one business day.");
      appointmentForm.reset();
    });
  }
})();
