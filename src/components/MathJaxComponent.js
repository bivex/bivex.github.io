/**
 * Copyright (c) 2025 [Your Name], Individual Entrepreneur
 * INN: [Your Tax ID Number]
 * Created: 2025-05-22 04:52
 * Last Updated: 2025-05-22 05:02
 * All rights reserved. Unauthorized copying, modification,
 * distribution, or use is strictly prohibited.
 */

import React, { useEffect, useRef, useState } from 'react';

const MathJaxComponent = ({ math }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const renderMath = async () => {
      if (!window.MathJax || !containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);
        
        // Clear previous math
        containerRef.current.innerHTML = math;
        
        // Typeset the new math
        await window.MathJax.typesetPromise([containerRef.current]);
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('MathJax error:', err);
        if (isMounted) {
          setError('Ошибка отображения формулы');
          setIsLoading(false);
        }
      }
    };

    renderMath();

    return () => {
      isMounted = false;
    };
  }, [math]);

  if (error) {
    return (
      <div className="text-red-600 text-center">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`math-content text-center text-2xl font-mono transition-opacity duration-200 ${
        isLoading ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ minHeight: '2em' }}
    />
  );
};

export default MathJaxComponent; 