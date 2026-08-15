import React from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { API_HEALTH_URL } from '../api/apiClient';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className='mt-8 border-t border-gray-200 bg-white/80 backdrop-blur-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs md:text-sm text-gray-500 gap-2'>
        <div className='flex items-center gap-1.5 text-center sm:text-left leading-snug'>
          <span className='text-xs sm:text-sm font-semibold tracking-tight text-gray-800'>
            EVSPolls
          </span>
          <span className='hidden sm:inline text-gray-300'>&middot;</span>
          <span className='text-[11px] sm:text-xs md:text-sm text-gray-500'>
            Secure online elections
          </span>
        </div>
        <div className='flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end leading-snug'>
          <span className='text-[11px] sm:text-xs md:text-sm text-gray-400'>
            © {year}
          </span>
          <span className='text-[11px] sm:text-xs md:text-sm text-gray-400'>
            Developed by{' '}
            <a
              href='https://techdave.netlify.app/'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-500 transition-colors duration-150'>
              David
              <FiExternalLink size={12} aria-hidden='true' />
            </a>
          </span>
          <a
            href='https://evspolls.netlify.app'
            target='_blank'
            rel='noreferrer'
            className='text-[11px] sm:text-xs md:text-sm text-gray-500 hover:text-primary-600 transition-colors duration-150'>
            Live App
          </a>
          <a
            href={API_HEALTH_URL}
            target='_blank'
            rel='noreferrer'
            className='text-[11px] sm:text-xs md:text-sm text-gray-500 hover:text-primary-600 transition-colors duration-150'>
            API Status
          </a>
          <a
            href='https://github.com/David-mwendwa/EVSPolls'
            target='_blank'
            rel='noreferrer'
            className='text-[11px] sm:text-xs md:text-sm text-gray-500 hover:text-primary-600 transition-colors duration-150'>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
