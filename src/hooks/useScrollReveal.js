import { useEffect, useRef } from 'react';


export default function useScrollReveal(deps = []) {
  const observerRef = useRef(null);
  const mutationRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            
          entry.target.classList.remove('revealed');
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px 0px 0px', 
      }
    );

    const observeElements = () => {
      if (!observerRef.current) return;
      const elements = document.querySelectorAll('[data-reveal]');
      elements.forEach((el) => observerRef.current.observe(el));
    };

    observeElements();

    
    mutationRef.current = new MutationObserver(() => {
      observeElements();
    });

    mutationRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (mutationRef.current) mutationRef.current.disconnect();
    };
  }, deps);
}
