'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as Babel from '@babel/standalone';

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
    <TooltipProvider>
      <Component />
    </TooltipProvider>
  );
}
