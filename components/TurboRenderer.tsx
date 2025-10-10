'use client';

import React, { useState, useEffect, useMemo, Component as ReactComponent } from 'react';
import * as Babel from '@babel/standalone';

// Error boundary to catch runtime errors in generated components
class ErrorBoundary extends ReactComponent<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8 bg-red-50">
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Runtime Error</h2>
            <p className="text-sm text-red-800 mb-2">The generated component encountered an error:</p>
            <p className="text-sm text-red-800 font-mono whitespace-pre-wrap bg-red-100 p-3 rounded">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <p className="text-xs text-gray-600 mt-4">Try submitting a different prompt or simplify your request.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Import vanilla shadcn components for turbo mode (not neo-brutalist)
import { Button } from '@/components/turbo-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/turbo-ui/card';
import { Input } from '@/components/turbo-ui/input';
import { Textarea } from '@/components/turbo-ui/textarea';
// Import remaining components from ui directory (they don't have neo styling)
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';

// Fix common JSX issues that AI might generate
function fixCommonJsxIssues(jsx: string): string {
  let fixed = jsx;

  // Fix 1: Add missing value prop to SelectItem components (including multiline)
  // Match <SelectItem> tags without a value prop and add one based on the content
  fixed = fixed.replace(
    /<SelectItem(\s+[^>]*?)?\s*>([\s\S]*?)<\/SelectItem>/g,
    (match, attrs, content) => {
      // Check if value prop already exists and is non-empty
      const hasValueMatch = attrs?.match(/value\s*=\s*["']([^"']*)["']/);
      if (hasValueMatch && hasValueMatch[1].trim()) {
        return match; // Already has non-empty value prop
      }

      // If has empty value, remove it so we can add a proper one
      let cleanAttrs = attrs || '';
      if (hasValueMatch && !hasValueMatch[1].trim()) {
        cleanAttrs = cleanAttrs.replace(/value\s*=\s*["'][^"']*["']\s*/g, '');
      }

      // Extract text content (strip HTML tags and whitespace)
      const textContent = content.replace(/<[^>]+>/g, '').trim();

      // Generate a safe value from content (lowercase, no spaces, no special chars)
      let value = textContent.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

      // If we couldn't generate a value, use a UUID-like fallback
      if (!value) {
        value = `option-${Math.random().toString(36).substr(2, 9)}`;
      }

      return `<SelectItem${cleanAttrs ? ' ' + cleanAttrs.trim() : ''} value="${value}">${content}</SelectItem>`;
    }
  );

  // Fix 2: Ensure all Select components have a default value or onValueChange
  // This prevents controlled component warnings
  fixed = fixed.replace(
    /<Select(\s+[^>]*?)?\s*>/g,
    (match, attrs) => {
      // Check if defaultValue or value already exists
      if (attrs && (/defaultValue\s*=/.test(attrs) || /value\s*=/.test(attrs))) {
        return match;
      }

      // Add defaultValue=""
      return `<Select${attrs || ''} defaultValue="">`;
    }
  );

  // Fix 3: Fix self-closing tags that should be properly closed
  // Some components need proper closing tags
  fixed = fixed.replace(/<(SelectTrigger|SelectContent|DialogContent|CardHeader|CardContent)([^>]*?)\/>/g, '<$1$2></$1>');

  console.log('[JSX Fix] Applied fixes:', {
    selectItemsFixed: (jsx.match(/<SelectItem/g) || []).length,
    selectsFixed: (jsx.match(/<Select[>\s]/g) || []).length
  });

  return fixed;
}

interface TurboRendererProps {
  jsx: string;
}

export default function TurboRenderer({ jsx }: TurboRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    try {
      setError(null);
      console.log('TurboRenderer received JSX:', jsx);

      if (!jsx || jsx.trim() === '') {
        console.log('Empty JSX, skipping render');
        return;
      }

      // Remove import statements and export default
      let cleanedJsx = jsx
        // Remove all import statements (including multi-line)
        .replace(/import\s+(?:{[^}]*}|[^;]+)\s+from\s+['"][^'"]+['"];?\s*/g, '')
        // Remove export default
        .replace(/export\s+default\s+/g, '')
        .trim();

      console.log('Cleaned JSX:', cleanedJsx);

      // Fix common JSX issues before processing
      cleanedJsx = fixCommonJsxIssues(cleanedJsx);

      // Extract the component function
      const componentMatch = cleanedJsx.match(/function\s+Component\s*\([^)]*\)\s*{[\s\S]*}/);
      if (!componentMatch) {
        throw new Error('Could not find function Component() { ... }');
      }

      console.log('Extracted component:', componentMatch[0]);

      // Transform JSX to JavaScript using Babel
      const transformed = Babel.transform(componentMatch[0], {
        presets: ['react'],
        filename: 'component.jsx',
      }).code;

      if (!transformed) {
        throw new Error('Babel transformation failed');
      }

      console.log('Transformed code:', transformed);

      // The transformed code defines a function Component
      // We need to execute it and return the Component
      const finalCode = `
        ${transformed};
        return Component;
      `;

      console.log('Final code to execute:', finalCode);

      // Create a function that returns the component
      const componentFunction = new Function(
        'React',
        'useState',
        'useEffect',
        'useMemo',
        'useCallback',
        'Button',
        'Card',
        'CardContent',
        'CardDescription',
        'CardHeader',
        'CardTitle',
        'Badge',
        'Input',
        'Textarea',
        'Select',
        'SelectContent',
        'SelectItem',
        'SelectTrigger',
        'SelectValue',
        'Dialog',
        'DialogContent',
        'DialogHeader',
        'DialogTitle',
        'DialogTrigger',
        'Tabs',
        'TabsContent',
        'TabsList',
        'TabsTrigger',
        'Accordion',
        'AccordionContent',
        'AccordionItem',
        'AccordionTrigger',
        'Slider',
        'Switch',
        'Progress',
        'Popover',
        'PopoverContent',
        'PopoverTrigger',
        'Tooltip',
        'TooltipContent',
        'TooltipProvider',
        'TooltipTrigger',
        'Calendar',
        'Checkbox',
        finalCode
      );

      // Execute the function with all the dependencies
      const GeneratedComponent = componentFunction(
        React,
        useState,
        useEffect,
        useMemo,
        React.useCallback,
        Button,
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
        Badge,
        Input,
        Textarea,
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
        Tabs,
        TabsContent,
        TabsList,
        TabsTrigger,
        Accordion,
        AccordionContent,
        AccordionItem,
        AccordionTrigger,
        Slider,
        Switch,
        Progress,
        Popover,
        PopoverContent,
        PopoverTrigger,
        Tooltip,
        TooltipContent,
        TooltipProvider,
        TooltipTrigger,
        Calendar,
        Checkbox
      );

      console.log('Generated component:', GeneratedComponent);
      setComponent(() => GeneratedComponent);
    } catch (err) {
      console.error('Component rendering error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [jsx]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-red-50">
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Render Error</h2>
          <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading component...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary key={jsx}>
      <TooltipProvider>
        <Component />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
