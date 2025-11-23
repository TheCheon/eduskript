'use client'

import React from 'react'

interface ColorTitleProps {
  children: React.ReactNode
  className?: string
}

export function ColorTitle({ children, className = '' }: ColorTitleProps) {
  const text = typeof children === 'string'
    ? children
    : React.Children.toArray(children).join('')

  return (
    <h1
      className={`color-title ${className}`}
      data-text={text}
    >
      {children}
    </h1>
  )
}