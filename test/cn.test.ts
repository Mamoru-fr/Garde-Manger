import { describe, it, expect } from 'vitest';
import { cn } from '../utils/cn';

describe('cn utility', () => {
  it('should combine multiple class names', () => {
    expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
  });

  it('should handle single class name', () => {
    expect(cn('single-class')).toBe('single-class');
  });

  it('should filter out undefined values', () => {
    expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
  });

  it('should filter out null values', () => {
    expect(cn('class1', null, 'class2')).toBe('class1 class2');
  });

  it('should filter out false values', () => {
    expect(cn('class1', false, 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    
    expect(cn('base', isActive && 'active', isDisabled && 'disabled'))
      .toBe('base active');
  });

  it('should return empty string when no valid classes', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('should handle all falsy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('should handle mixed valid and invalid values', () => {
    expect(cn('valid1', false, 'valid2', null, 'valid3', undefined))
      .toBe('valid1 valid2 valid3');
  });

  it('should handle empty string as valid class', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });

  it('should handle no arguments', () => {
    expect(cn()).toBe('');
  });

  it('should work with Tailwind class names', () => {
    expect(cn(
      'px-4 py-2',
      'bg-blue-500',
      'hover:bg-blue-600',
      'text-white'
    )).toBe('px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white');
  });

  it('should handle complex conditional logic', () => {
    const variant = 'primary' as 'primary' | 'secondary';
    const size = 'lg' as 'sm' | 'lg';
    const disabled = false;
    
    expect(cn(
      'base-button',
      variant === 'primary' && 'bg-blue-500',
      variant === 'secondary' && 'bg-gray-500',
      size === 'sm' && 'text-sm',
      size === 'lg' && 'text-lg',
      disabled && 'opacity-50'
    )).toBe('base-button bg-blue-500 text-lg');
  });

  it('should maintain order of classes', () => {
    expect(cn('first', 'second', 'third')).toBe('first second third');
  });

  it('should handle classes with special characters', () => {
    expect(cn('w-1/2', 'md:w-2/3', 'lg:w-3/4')).toBe('w-1/2 md:w-2/3 lg:w-3/4');
  });

  it('should work in real-world scenario', () => {
    const isLoading = false;
    const isError = false;
    const variant = 'primary' as 'primary' | 'secondary';
    const customClass = 'my-custom-class';
    
    const result = cn(
      'btn',
      'rounded-lg',
      'px-4 py-2',
      variant === 'primary' && 'bg-blue-500 text-white',
      variant === 'secondary' && 'bg-gray-200 text-gray-800',
      isLoading && 'opacity-50 cursor-wait',
      isError && 'border-red-500',
      customClass
    );
    
    expect(result).toBe('btn rounded-lg px-4 py-2 bg-blue-500 text-white my-custom-class');
  });

  it('should handle multiple consecutive falsy values', () => {
    expect(cn('class1', false, false, null, undefined, 'class2'))
      .toBe('class1 class2');
  });

  it('should handle only falsy values except empty string', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });

  // Array support tests
  it('should handle simple arrays', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('should handle nested arrays', () => {
    expect(cn(['class1', ['class2', 'class3']], 'class4'))
      .toBe('class1 class2 class3 class4');
  });

  it('should handle deeply nested arrays', () => {
    expect(cn(['class1', ['class2', ['class3', ['class4']]]], 'class5'))
      .toBe('class1 class2 class3 class4 class5');
  });

  it('should filter falsy values in arrays', () => {
    expect(cn(['class1', false, 'class2', null, 'class3', undefined]))
      .toBe('class1 class2 class3');
  });

  it('should handle conditional arrays', () => {
    const isPrimary = true;
    expect(cn(
      'base',
      isPrimary && ['text-white', 'bg-blue-500', 'hover:bg-blue-600']
    )).toBe('base text-white bg-blue-500 hover:bg-blue-600');
  });

  it('should handle false conditional arrays', () => {
    const isPrimary = false;
    expect(cn(
      'base',
      isPrimary && ['text-white', 'bg-blue-500']
    )).toBe('base');
  });

  it('should handle mixed arrays and strings', () => {
    expect(cn(
      'class1',
      ['class2', 'class3'],
      'class4',
      ['class5', ['class6']]
    )).toBe('class1 class2 class3 class4 class5 class6');
  });

  it('should handle empty arrays', () => {
    expect(cn('class1', [], 'class2')).toBe('class1 class2');
  });

  it('should handle variant pattern with arrays', () => {
    const variant = 'primary' as 'primary' | 'secondary';
    
    const result = cn(
      'btn rounded-lg px-4 py-2',
      variant === 'primary' && [
        'bg-blue-500',
        'text-white',
        'shadow-lg',
        'hover:shadow-xl'
      ],
      variant === 'secondary' && [
        'bg-gray-200',
        'text-gray-800',
        'border border-gray-300'
      ]
    );
    
    expect(result).toBe('btn rounded-lg px-4 py-2 bg-blue-500 text-white shadow-lg hover:shadow-xl');
  });

  it('should handle complex real-world scenario with arrays', () => {
    const variant = 'primary' as 'primary' | 'secondary';
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'button',
      ['flex', 'items-center', 'justify-center'],
      variant === 'primary' && [
        'bg-blue-500',
        'text-white',
        'hover:bg-blue-600'
      ],
      variant === 'secondary' && [
        'bg-gray-200',
        'text-gray-800',
        'hover:bg-gray-300'
      ],
      isActive && ['border-2', 'border-blue-700'],
      isDisabled && ['opacity-50', 'cursor-not-allowed']
    );
    
    expect(result).toBe('button flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-700');
  });

  it('should handle arrays with falsy values at different levels', () => {
    expect(cn(
      'class1',
      [false, 'class2', [null, 'class3', [undefined, 'class4']]],
      'class5'
    )).toBe('class1 class2 class3 class4 class5');
  });
});
