// src/app/dashboard/layout.tsx
import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SidebarWrapper from './SidebarWrapper';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get('userEmail')?.value;

  if (!userEmail) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      role: true,
      email: true,
      position: true,
      subStatus: true,
      trialEndsAt: true,
      subEndsAt: true,
      createdAt: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Super Admin master email check
  const SUPER_ADMIN_EMAIL = 'nexjunction@gmail.com';
  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Route Guard: Only check trial or subscription expiration if the user is a DOCTOR
  // and definitely NOT an ADMIN or Super Admin. Admins are lifetime-free.
  if (user.role === 'DOCTOR' && !isSuperAdmin) {
    const now = new Date();
    let isExpired = false;

    if (user.subStatus === 'ACTIVE') {
      // If active, check if subEndsAt has passed (if subEndsAt is set)
      if (user.subEndsAt && new Date(user.subEndsAt) < now) {
        isExpired = true;
      } else {
        isExpired = false; // Explicitly active and valid
      }
    } else if (user.subStatus === 'EXPIRED') {
      isExpired = true;
    } else {
      // TRIAL / NULL / Pending Status: Calculate 30-day trial window
      let trialEnd: Date;
      if (user.trialEndsAt) {
        trialEnd = new Date(user.trialEndsAt);
      } else if (user.createdAt) {
        trialEnd = new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      // If current time is past the trial end date, mark as expired
      if (now > trialEnd) {
        isExpired = true;
      } else {
        isExpired = false; // Still safely within the 30-day trial period!
      }
    }

    if (isExpired) {
      if (user.subStatus !== 'EXPIRED') {
        await prisma.user.update({
          where: { id: user.id },
          data: { subStatus: 'EXPIRED' },
        });
      }
      redirect('/subscription');
    }
  }

  const userRole = user.role; // "ADMIN", "DOCTOR", or "RECEPTIONIST"
  const isAdmin = userRole === 'ADMIN';
  const isDoctor = userRole === 'DOCTOR';

  // Define navigation links dynamically based on the user's role and admin tier
  let navLinks = [];

  if (isAdmin) {
    if (isSuperAdmin) {
      navLinks = [
        {
          name: 'Admin Portal',
          href: '/dashboard/admin',
          activePattern: '/dashboard/admin',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          name: 'Subscriptions & Revenue',
          href: '/dashboard/admin/subscriptions',
          activePattern: '/dashboard/admin/subscriptions',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Payment Gateway',
          href: '/dashboard/admin/settings/payment',
          activePattern: '/dashboard/admin/settings/payment',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          name: 'Account Settings',
          href: '/dashboard/admin/settings',
          activePattern: '/dashboard/admin/settings',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ];
    } else {
      navLinks = [
        {
          name: 'Admin Panel',
          href: '/dashboard/assigned-admin',
          activePattern: '/dashboard/assigned-admin',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          name: 'Account & Profile',
          href: '/dashboard/assigned-admin/account',
          activePattern: '/dashboard/assigned-admin/account',
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ];
    }
  } else if (isDoctor) {
    navLinks = [
      {
        name: 'Dashboard',
        href: '/dashboard/doctor',
        activePattern: '/dashboard/doctor',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
          </svg>
        ),
      },
      {
        name: 'Appointments',
        href: '/dashboard/doctor/appointments',
        activePattern: '/dashboard/doctor/appointments',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Patients',
        href: '/dashboard/doctor/patients',
        activePattern: '/dashboard/doctor/patients',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        name: 'Admin Connection',
        href: '/dashboard/staff-admin',
        activePattern: '/dashboard/staff-admin',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
    ];
  } else {
    navLinks = [
      {
        name: 'Reception Portal',
        href: '/dashboard/receptionist',
        activePattern: '/dashboard/receptionist',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Admin Connection',
        href: '/dashboard/staff-admin',
        activePattern: '/dashboard/staff-admin',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
    ];
  }

  return <SidebarWrapper navLinks={navLinks}>{children}</SidebarWrapper>;
}