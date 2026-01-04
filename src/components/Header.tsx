'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Product = {
  name: string;
  category: string;
  sku: string;
  image: string;
  price: number;
};

type CartItem = Product & { quantity: number };

const categories: { label: string; href: string }[] = [
  { label: 'דגמים', href: '/models' },
  { label: 'הדמייה LIVE', href: '/live' },
  { label: 'טקסטורות', href: '/materials' },
  { label: 'שאלות תשובות', href: '/faq' },
];

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'IL', name: 'Israel' },
  { code: 'FR', name: 'France' },
  // Can add more countries
];
const languages = [
  { code: 'EN', name: 'English' },
  { code: 'HE', name: 'עברית' },
  { code: 'FR', name: 'Français' },
];
const currencies = [
  { code: 'USD', name: 'USD ($)' },
  { code: 'ILS', name: 'ILS (₪)' },
  { code: 'EUR', name: 'EUR (€)' },
];

// Empty arrays for real data
const defaultProducts: Product[] = [];
const defaultCart: CartItem[] = [];

const Header: React.FC = () => {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [country, setCountry] = useState('US');
  const [language, setLanguage] = useState('EN');
  const [currency, setCurrency] = useState('USD');
  const [loginOpen, setLoginOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search products from backend
  useEffect(() => {
    if (search.length >= 2) {
      setSearchLoading(true);
      fetch(
        `http://localhost:5000/api/products/search?q=${encodeURIComponent(
          search
        )}`
      )
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setSearchLoading(false);
        })
        .catch(err => {
          console.error('Search error:', err);
          setSearchResults([]);
          setSearchLoading(false);
        });
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const suggestions = searchResults;
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const handleRemoveFromCart = (sku: string) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
    setCartMessage('Item removed from cart');
    setTimeout(() => setCartMessage(null), 2000);
  };

  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: '',
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Registration form state
  const [registerFormData, setRegisterFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Real-time validation errors
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginOpen(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    console.log('🚀 Starting login process...', loginFormData);

    try {
      // Send login request to backend
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginFormData.email,
          password: loginFormData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login successful:', data);

        // Store user data and token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem(
          'adminUser',
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            role: data.user.role,
          })
        );

        setLoginOpen(false);

        // Redirect to admin dashboard
        window.location.href = '/admin';
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('💥 Login error:', err);
      setLoginError('Network error - please try again');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginOpen(false);
    setForgotPasswordOpen(true);
  };

  const handleCreateAccountClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginOpen(false);
    setCreateAccountOpen(true);
  };

  // Real-time validation functions
  const validateFirstName = (firstName: string) => {
    const englishOnlyRegex = /^[a-zA-Z\s'-]+$/;

    if (firstName.length === 0) {
      setFirstNameError('');
    } else if (firstName.length < 2) {
      setFirstNameError('First name must be at least 2 characters long');
    } else if (!englishOnlyRegex.test(firstName)) {
      setFirstNameError('Please use English letters only (A-Z, a-z)');
    } else {
      setFirstNameError('');
    }
  };

  const validateLastName = (lastName: string) => {
    const englishOnlyRegex = /^[a-zA-Z\s'-]+$/;

    if (lastName.length === 0) {
      setLastNameError('');
    } else if (lastName.length < 2) {
      setLastNameError('Last name must be at least 2 characters long');
    } else if (!englishOnlyRegex.test(lastName)) {
      setLastNameError('Please use English letters only (A-Z, a-z)');
    } else {
      setLastNameError('');
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length === 0) {
      setEmailError('');
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (password: string) => {
    if (password.length === 0) {
      setPasswordError('');
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
    } else {
      setPasswordError('');
    }
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (confirmPassword.length === 0) {
      setConfirmPasswordError('');
    } else if (confirmPassword !== registerFormData.password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');

    // Validate passwords match
    if (registerFormData.password !== registerFormData.confirmPassword) {
      setRegisterError('Passwords do not match');
      setRegisterLoading(false);
      return;
    }

    // Validate first name
    if (registerFormData.firstName.length < 2) {
      setRegisterError('First name must be at least 2 characters long');
      setRegisterLoading(false);
      return;
    }

    // Validate last name
    if (registerFormData.lastName.length < 2) {
      setRegisterError('Last name must be at least 2 characters long');
      setRegisterLoading(false);
      return;
    }

    // Validate password length
    if (registerFormData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      setRegisterLoading(false);
      return;
    }

    console.log('🚀 Starting registration process...', registerFormData);

    try {
      // Send registration request to backend
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: registerFormData.firstName,
          lastName: registerFormData.lastName,
          email: registerFormData.email,
          password: registerFormData.password,
          phone: registerFormData.phone,
          company: registerFormData.company,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Registration successful:', data);

        if (data.requiresVerification) {
          // Show success message and verification modal
          setCreateAccountOpen(false);
          setVerificationModalOpen(true);
          setVerificationEmail(data.user.email);

          // Show success message
          alert(
            '🎉 Account created successfully! Please check your email to verify your account.'
          );
        } else {
          // Store user data and token
          localStorage.setItem('userToken', data.token);
          localStorage.setItem(
            'userData',
            JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              role: data.user.role,
            })
          );

          setCreateAccountOpen(false);

          // Redirect to home page
          window.location.href = '/';
        }
      } else {
        setRegisterError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('💥 Registration error:', err);
      setRegisterError('Network error - please try again');
    } finally {
      setRegisterLoading(false);
    }
  };

  function toggleWishlist(product: Product) {
    setWishlist(prev =>
      prev.some(p => p.sku === product.sku)
        ? prev.filter(p => p.sku !== product.sku)
        : [...prev, product]
    );
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existingItem = prev.find(item => item.sku === product.sku);
      if (existingItem) {
        return prev.map(item =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
    setCartMessage('Product added to cart');
    setTimeout(() => setCartMessage(null), 2000);
  }

  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [savedSims, setSavedSims] = useState<Array<{ id: string; name: string; createdAt: number }>>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userToken, setUserToken] = useState<string | null>(null);
  const whatsappMessage = encodeURIComponent('היי, אשמח לייעוץ מהיר על מדרגות מרחפות לפרויקט שלי');
  const wishlistShareUrl = React.useMemo(() => {
    const items = wishlist.map(p => `${p.name} (SKU: ${p.sku})`).join(', ');
    const msg = items.length
      ? `שלום, אשמח למידע על הפריטים: ${items}`
      : 'שלום, יש לי שאלה';
    return `https://api.whatsapp.com/send?phone=972539994995&text=${encodeURIComponent(msg)}`;
  }, [wishlist]);
  const [activeHash, setActiveHash] = useState<string>('');
  useEffect(() => {
    const updateHash = () => setActiveHash(window.location.hash || '');
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);
  const isActive = (href: string) => {
    if (href.startsWith('/')) return pathname === href;
    if (href.startsWith('#')) return pathname === '/' && activeHash === href;
    return false;
  };

  // Load cart and wishlist from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedWishlist = localStorage.getItem('wishlist');
    const savedUserToken = localStorage.getItem('userToken');
    const savedSims = localStorage.getItem('ascenso:sims');

    if (savedUserToken) {
      setUserToken(savedUserToken);
    }

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (error) {
        console.error('Error loading wishlist:', error);
      }
    }
    if (savedSims) {
      try {
        const arr = JSON.parse(savedSims);
        setSavedSims(arr.map((s: any) => ({ id: s.id, name: s.name, createdAt: s.createdAt })));
      } catch (error) {
        console.error('Error loading saved simulations:', error);
      }
    }
  }, []);

  // Refresh saved simulations when localStorage changes (from /live page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== 'ascenso:sims') return;
      try {
        const arr = JSON.parse(localStorage.getItem('ascenso:sims') || '[]');
        setSavedSims(arr.map((s: any) => ({ id: s.id, name: s.name, createdAt: s.createdAt })));
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Save cart and wishlist to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const updateQuantity = (sku: string, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.sku === sku
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const clearWishlist = () => setWishlist([]);

  // Subtle haptic feedback for mobile taps
  const vibrate = (duration: number = 35) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // @ts-ignore - vibrate may not be typed on all TS lib targets
        navigator.vibrate(duration);
      }
    } catch {}
  };

  return (
    <>
      {/* Top Bar */}
      <div className="w-full bg-gray-900 text-gray-100 text-xs">
        <div className="w-full px-0 md:pr-6 md:pl-0 py-2 md:py-1 flex items-center gap-3 flex-wrap justify-center md:justify-start" dir="rtl">
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
            <span>אחריות יצרן</span>
          </span>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h3l4 4v4a2 2 0 0 1-2 2h-3"/><circle cx="5.5" cy="19.5" r="1.5"/><circle cx="18.5" cy="19.5" r="1.5"/>
            </svg>
            <span>אספקה מהירה</span>
          </span>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>שירות בכל הארץ</span>
          </span>
        </div>
      </div>
      {/* Modal for country/language/currency selection */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white shadow-2xl p-8 w-full max-w-md relative mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute left-1/2 -translate-x-1/2 top-2 text-2xl cursor-pointer"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="modal-title">
              Please choose your country/region preferences
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ship To
                </label>
                <select
                  className="w-full border px-3 py-2 cursor-pointer"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Language
                </label>
                <select
                  className="w-full border px-3 py-2 cursor-pointer"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  {languages.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Currency
                </label>
                <select
                  className="w-full border px-3 py-2 cursor-pointer"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                >
                  {currencies.map(cu => (
                    <option key={cu.code} value={cu.code}>
                      {cu.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                {/* Example payment icons (SVG or images can be replaced) */}
                <span className="inline-block w-10 h-6 bg-gray-200" />
                <span className="inline-block w-10 h-6 bg-gray-200" />
                <span className="inline-block w-10 h-6 bg-gray-200" />
                <span className="inline-block w-10 h-6 bg-gray-200" />
                <span className="inline-block w-10 h-6 bg-gray-200" />
              </div>
              <button
                className="mt-4 w-full bg-black text-white py-2 font-bold hover:bg-gray-800 transition tracking-wider uppercase cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                Update Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {loginOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          onClick={() => setLoginOpen(false)}
        >
          <div
            className="bg-white shadow-2xl p-10 w-full max-w-md relative mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer transition-colors"
              onClick={() => setLoginOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-semibold text-[#1a1a2e] mb-2 tracking-wide">
                Welcome Back
              </h2>
              <p className="text-gray-600 text-sm">
                Sign in to your ASCENSO account
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="mr-3">
                    <p className="text-sm text-red-800">{loginError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="login-email"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  value={loginFormData.email}
                  onChange={e =>
                    setLoginFormData(prev => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={loginFormData.password}
                  onChange={e =>
                    setLoginFormData(prev => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Remember me
                  </span>
                </label>
                <button
                  className="text-sm text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  type="button"
                  onClick={handleForgotPasswordClick}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#1a1a2e] text-white py-3 font-semibold hover:bg-[#16213e] transition-colors tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loginLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Create account */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  className="text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                  type="button"
                  onClick={handleCreateAccountClick}
                >
                  Create one now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          onClick={() => setForgotPasswordOpen(false)}
        >
          <div
            className="bg-white shadow-2xl p-10 w-full max-w-md relative mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer transition-colors"
              onClick={() => setForgotPasswordOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-semibold text-[#1a1a2e] mb-2 tracking-wide">
                Reset Password
              </h2>
              <p className="text-gray-600 text-sm">
                Enter your email to receive reset instructions
              </p>
            </div>

            {/* Form */}
            <form className="space-y-6">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="reset-email"
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Reset button */}
              <button
                type="submit"
                className="w-full bg-[#1a1a2e] text-white py-3 font-semibold hover:bg-[#16213e] transition-colors tracking-wide uppercase cursor-pointer"
              >
                Send Reset Link
              </button>
            </form>

            {/* Back to sign in */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  className="text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                  type="button"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setLoginOpen(true);
                  }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {createAccountOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          onClick={() => setCreateAccountOpen(false)}
        >
          <div
            className="bg-white shadow-2xl p-8 w-full max-w-md relative mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer transition-colors"
              onClick={() => setCreateAccountOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-serif font-semibold text-[#1a1a2e] mb-2 tracking-wide">
                Create Account
              </h2>
              <p className="text-gray-600 text-sm">
                Join ASCENSO and start your journey
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {registerError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {registerError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="first-name"
                  >
                    First Name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                    placeholder="First name"
                    autoComplete="given-name"
                    value={registerFormData.firstName}
                    onChange={e => {
                      const value = e.target.value;
                      setRegisterFormData(prev => ({
                        ...prev,
                        firstName: value,
                      }));
                      validateFirstName(value);
                    }}
                    required
                  />
                  {firstNameError && (
                    <p className="text-red-500 text-sm mt-1">
                      {firstNameError}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="last-name"
                  >
                    Last Name
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                    placeholder="Last name"
                    autoComplete="family-name"
                    value={registerFormData.lastName}
                    onChange={e => {
                      const value = e.target.value;
                      setRegisterFormData(prev => ({
                        ...prev,
                        lastName: value,
                      }));
                      validateLastName(value);
                    }}
                    required
                  />
                  {lastNameError && (
                    <p className="text-red-500 text-sm mt-1">{lastNameError}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="create-email"
                >
                  Email Address
                </label>
                <input
                  id="create-email"
                  type="email"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={registerFormData.email}
                  onChange={e => {
                    const value = e.target.value;
                    setRegisterFormData(prev => ({
                      ...prev,
                      email: value,
                    }));
                    validateEmail(value);
                  }}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="create-password"
                >
                  Password
                </label>
                <input
                  id="create-password"
                  type="password"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={registerFormData.password}
                  onChange={e => {
                    const value = e.target.value;
                    setRegisterFormData(prev => ({
                      ...prev,
                      password: value,
                    }));
                    validatePassword(value);
                  }}
                  required
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="confirm-password"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  value={registerFormData.confirmPassword}
                  onChange={e => {
                    const value = e.target.value;
                    setRegisterFormData(prev => ({
                      ...prev,
                      confirmPassword: value,
                    }));
                    validateConfirmPassword(value);
                  }}
                  required
                />
                {confirmPasswordError && (
                  <p className="text-red-500 text-sm mt-1">
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="phone"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                    placeholder="Phone number"
                    autoComplete="tel"
                    value={registerFormData.phone}
                    onChange={e =>
                      setRegisterFormData(prev => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="company"
                  >
                    Company (Optional)
                  </label>
                  <input
                    id="company"
                    type="text"
                    className="w-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent transition-all"
                    placeholder="Company name"
                    autoComplete="organization"
                    value={registerFormData.company}
                    onChange={e =>
                      setRegisterFormData(prev => ({
                        ...prev,
                        company: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Terms and conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
                  required
                />
                <span className="ml-2 text-sm text-gray-600">
                  I agree to the{' '}
                  <button
                    className="text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0"
                    type="button"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    className="text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0"
                    type="button"
                  >
                    Privacy Policy
                  </button>
                </span>
              </div>

              {/* Create Account button */}
              <button
                type="submit"
                disabled={registerLoading}
                className="w-full bg-[#1a1a2e] text-white py-3 font-semibold hover:bg-[#16213e] transition-colors tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Back to sign in */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  className="text-[#1a1a2e] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                  type="button"
                  onClick={() => {
                    setCreateAccountOpen(false);
                    setLoginOpen(true);
                  }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Removed Virtual Appointment for simple site */}

      {/* Main Header */}
      <header className="w-full bg-white shadow flex flex-col items-center" suppressHydrationWarning>
        <div className="w-full relative grid grid-cols-3 items-center px-0 md:px-8 pt-8 pb-7 md:py-3">
          {/* left - phone and links */}
          <div className="hidden md:flex items-center space-x-4 md:space-x-6 text-gray-700 text-sm min-w-0 justify-start md:col-start-1 md:justify-self-start">
            <a
              href={`https://api.whatsapp.com/send?phone=972539994995&text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:underline space-x-1 cursor-pointer"
              title="פנייה ב‑WhatsApp"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                <path d="M20.52 3.48A11.86 11.86 0 0012.07 0C5.7 0 .57 5.13.57 11.5c0 2.03.54 4 .1 5.38L0 24l7.3-1.9a12.02 12.02 0 004.77.97h.01c6.37 0 11.5-5.13 11.5-11.5 0-3.07-1.2-5.96-3.06-8.09zM12.08 21.5h-.01a9.96 9.96 0 01-5.08-1.4l-.36-.21-4.34 1.13 1.16-4.22-.23-.43a9.97 9.97 0 01-1.45-5.14C1.77 6.24 6.01 2 11.06 2c2.67 0 5.17 1.04 7.06 2.93a9.94 9.94 0 012.93 7.06c0 5.05-4.24 9.51-9.97 9.51zm5.75-7.2c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.37.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.15-.15.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.39-.26-.63-.53-.54-.72-.55h-.62c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.27.16.21 2.22 3.38 5.38 4.73.75.32 1.34.51 1.79.65.75.24 1.44.21 1.98.13.6-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37z"/>
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a
              href="tel:+972539994995"
              className="flex items-center hover:underline space-x-1 cursor-pointer"
              title="התקשר עכשיו"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.11 5.18 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.72c.12.89.32 1.76.6 2.59a2 2 0 0 1-.45 2.11L9.1 10.9a16 16 0 0 0 7 7l1.48-1.15a2 2 0 0 1 2.11-.45c.83.28 1.7.48 2.59.6A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span className="hidden sm:inline">התקשר עכשיו</span>
            </a>
          </div>
          {/* center - centered logo (אבסולוטי בדסקטופ לשמירה על מרכז אמיתי) */}
          <div className="absolute left-[6px] top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 select-none z-10">
            <Link href="/" aria-label="דף הבית" className="select-none" onClick={() => vibrate(30)}>
              <span className="text-[34px] md:text-[44px] font-serif font-prosto font-semibold tracking-widest text-[#1a1a2e] uppercase">
                ASCEN
                <span style={{ fontWeight: 170 }}>S</span>
                O
              </span>
            </Link>
          </div>
          {/* right - icons */}
          <div className="flex justify-end items-center space-x-4 md:space-x-6 text-gray-700 justify-self-end z-10 md:z-0 md:col-start-3 md:justify-self-end absolute right-[6px] top-1/2 -translate-y-1/2 md:static md:transform-none md:translate-y-0">
            {/* Mobile-only icons group (WhatsApp black + Call) */}
            <div className="flex items-center gap-3 md:hidden">
              <a
                href={`https://api.whatsapp.com/send?phone=972539994995&text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="פנייה ב‑WhatsApp"
                title="פנייה ב‑WhatsApp"
                className="cursor-pointer text-[#1a1a2e] transition-transform duration-150 active:scale-90 active:opacity-80 select-none touch-manipulation"
                onClick={() => vibrate(30)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.52 3.48A11.86 11.86 0 0012.07 0C5.7 0 .57 5.13.57 11.5c0 2.03.54 4 .1 5.38L0 24l7.3-1.9a12.02 12.02 0 004.77.97h.01c6.37 0 11.5-5.13 11.5-11.5 0-3.07-1.2-5.96-3.06-8.09zM12.08 21.5h-.01a9.96 9.96 0 01-5.08-1.4l-.36-.21-4.34 1.13 1.16-4.22-.23-.43a9.97 9.97 0 01-1.45-5.14C1.77 6.24 6.01 2 11.06 2c2.67 0 5.17 1.04 7.06 2.93a9.94 9.94 0 012.93 7.06c0 5.05-4.24 9.51-9.97 9.51zm5.75-7.2c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.37.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.15-.15.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.39-.26-.63-.53-.54-.72-.55h-.62c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.27.16.21 2.22 3.38 5.38 4.73.75.32 1.34.51 1.79.65.75.24 1.44.21 1.98.13.6-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37z"/>
                </svg>
              </a>
              <a
                href="tel:+972539994995"
                aria-label="התקשר עכשיו"
                title="התקשר עכשיו"
                className="cursor-pointer text-[#1a1a2e] transition-transform duration-150 active:scale-90 active:opacity-80 select-none touch-manipulation"
                onClick={() => vibrate(30)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.11 5.18 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.72c.12.89.32 1.76.6 2.59a2 2 0 0 1-.45 2.11L9.1 10.9a16 16 0 0 0 7 7l1.48-1.15a2 2 0 0 1 2.11-.45c.83.28 1.7.48 2.59.6A2 2 0 0 1 22 16.92z"/>
                </svg>
              </a>
            </div>
            {/* Search field */}
            <div className="relative w-64 hidden md:block group">
              <input
                type="text"
                placeholder="חפש באתר…"
                dir="rtl"
                className="w-full border-b border-gray-700 focus:border-gray-900 outline-none py-1 px-8 bg-transparent text-xs transition-colors text-center placeholder:text-center"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                ref={inputRef}
                aria-label="חיפוש באתר"
                suppressHydrationWarning
              />
              {showSuggestions &&
                (searchLoading ? (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-10 rounded-b-none rounded-t-none text-sm p-4 text-center text-gray-500">
                    … מחפש
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-10 rounded-b-none rounded-t-none text-sm max-h-72 overflow-y-auto">
                    {suggestions.map(p => (
                      <li
                        key={p.sku}
                        className="flex items-center px-3 py-2 hover:bg-gray-100 gap-3"
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded cursor-pointer"
                          onMouseDown={() => {
                            setSearch(p.name);
                            setShowSuggestions(false);
                            inputRef.current?.blur();
                          }}
                        />
                        <div
                          className="flex flex-col flex-1 cursor-pointer"
                          onMouseDown={() => {
                            setSearch(p.name);
                            setShowSuggestions(false);
                            inputRef.current?.blur();
                          }}
                        >
                          <span className="font-medium text-gray-900">
                            {p.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {p.category} | SKU: {p.sku}
                          </span>
                          <span className="text-sm font-semibold text-blue-600">
                            ${p.price}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              toggleWishlist(p);
                            }}
                            title={
                              wishlist.some(item => item.sku === p.sku)
                                ? 'Remove from wishlist'
                                : 'Add to wishlist'
                            }
                          >
                            <svg
                              width="16"
                              height="16"
                              fill={
                                wishlist.some(item => item.sku === p.sku)
                                  ? 'currentColor'
                                  : 'none'
                              }
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            title="Add to cart"
                          >
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="9" cy="21" r="1" />
                              <circle cx="20" cy="21" r="1" />
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : search.length >= 2 ? (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-10 rounded-b-none rounded-t-none text-sm p-4 text-center text-gray-500">
                    לא נמצאו מוצרים
                  </div>
                ) : null)}
            </div>
            {/* Wishlist */}
            <button
              className="hover:text-gray-900 relative cursor-pointer transition-transform duration-150 active:scale-90 active:opacity-80 md:active:scale-100 md:active:opacity-100 select-none touch-manipulation"
              aria-label="מועדפים"
              onClick={() => {
                vibrate(30);
                setWishlistOpen(true);
              }}
              suppressHydrationWarning
            >
              <svg
                width="22"
                height="22"
                fill={savedSims.length > 0 ? '#1a1a2e' : 'none'}
                stroke="#1a1a2e"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {savedSims.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5">
                  {savedSims.length}
                </span>
              )}
            </button>
            {/* Share wishlist via WhatsApp - removed from header, available inside wishlist drawer */}
          </div>
        </div>
        {/* Category navigation */}
        <nav className="w-full flex justify-between md:justify-center gap-1 md:gap-8 py-0.5 md:py-1 bg-[#1a1a2e] md:bg-white overflow-x-hidden px-1" dir="rtl">
          {categories.map(cat => (
            <a
              key={cat.label}
              href={cat.href}
              className={`whitespace-nowrap text-[13px] md:text-sm font-semibold tracking-tight md:tracking-wide relative group rounded-md px-1 md:px-3 py-1 transition-all duration-150 active:scale-95 select-none touch-manipulation ${
                isActive(cat.href) ? 'text-white md:bg-gray-200 md:text-[#1a1a2e]' : 'text-white md:text-gray-700 md:hover:bg-gray-50'
              }`}
              onClick={() => vibrate(20)}
            >
              {cat.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Wishlist Modal */}
      {wishlistOpen && (
        <>
          <div
            className="side-overlay"
            onClick={() => setWishlistOpen(false)}
          />
          <div className="wishlist-drawer" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
              onClick={() => setWishlistOpen(false)}
              aria-label="סגור"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="wishlist-logo text-center mb-2 select-none">
              <span
                className="text-3xl font-semibold tracking-widest text-[#1a1a2e] uppercase"
                style={{ fontFamily: 'Prosto One, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}
              >
                ASCENSO
              </span>
            </div>
            <h2 className="modal-title wishlist-title text-center">המועדפים שלי</h2>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-[#1a1a2e] mb-2">הדמיות שמורות</h3>
              {savedSims.length === 0 ? (
                <div className="text-sm text-gray-500">אין הדמיות שמורות</div>
              ) : (
                <ul className="space-y-2">
                  {savedSims.map(s => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-[#1a1a2e]">{s.name}</div>
                        <div className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString('he-IL')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/live?sim=${encodeURIComponent(s.id)}`} className="px-3 py-1 text-xs border hover:bg-gray-100 cursor-pointer">
                          פתח
                        </a>
                        <button
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 border cursor-pointer"
                          onClick={() => {
                            try {
                              const arr = JSON.parse(localStorage.getItem('ascenso:sims') || '[]');
                              const next = arr.filter((x: any) => x.id !== s.id);
                              localStorage.setItem('ascenso:sims', JSON.stringify(next));
                              setSavedSims(next.map((x: any) => ({ id: x.id, name: x.name, createdAt: x.createdAt })));
                              window.dispatchEvent(new StorageEvent('storage', { key: 'ascenso:sims' } as any));
                            } catch {}
                          }}
                        >
                          מחק
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cart removed for simplified site */}

      {/* Email Verification Modal */}
      {verificationModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          onClick={() => setVerificationModalOpen(false)}
        >
          <div
            className="bg-white shadow-2xl p-8 w-full max-w-md relative mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer transition-colors"
              onClick={() => setVerificationModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-serif font-semibold text-[#1a1a2e] mb-2 tracking-wide">
                Check Your Email
              </h2>
              <p className="text-gray-600 text-sm">
                We've sent a verification link to:
              </p>
              <p className="text-[#1a1a2e] font-medium mt-1">
                {verificationEmail}
              </p>
            </div>

            {/* Content */}
            <div className="space-y-4 text-center">
              <p className="text-gray-600 text-sm">
                Please check your email and click the verification link to
                activate your account.
              </p>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                <strong>Didn't receive the email?</strong>
                <br />
                Check your spam folder or click "Resend Email" below.
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 bg-[#1a1a2e] text-white py-3 font-semibold hover:bg-[#0f0f1a] transition tracking-wider uppercase cursor-pointer text-sm rounded-none"
                  onClick={() => {
                    // TODO: Implement resend email functionality
                    alert(
                      'Resend email functionality will be implemented soon!'
                    );
                  }}
                >
                  Resend Email
                </button>
                <button
                  className="flex-1 border border-[#1a1a2e] text-[#1a1a2e] py-3 font-semibold hover:bg-gray-100 transition tracking-wider uppercase cursor-pointer text-sm rounded-none"
                  onClick={() => setVerificationModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
