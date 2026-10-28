import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import {cva,type VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {X} from 'lucide-react';
export const cn=(...inputs:Parameters<typeof clsx>)=>twMerge(clsx(inputs));
const buttonVariants=cva('button',{variants:{variant:{default:'button-primary',secondary:'button-secondary',ghost:'button-ghost',outline:'button-outline',destructive:'button-danger'},size:{default:'button-default',sm:'button-sm',icon:'button-icon'}},defaultVariants:{variant:'default',size:'default'}});
export type ButtonProps=React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonVariants>;
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,size,type='button',...props},ref)=><button type={type} ref={ref} className={cn(buttonVariants({variant,size}),className)} {...props}/>);
export function Tip({label,children}:{label:string;children:React.ReactNode}){return <TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="tooltip" sideOffset={7}>{label}<TooltipPrimitive.Arrow className="tooltip-arrow"/></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root>;}
export function IconButton({label,children,...props}:ButtonProps&{label:string}){return <Tip label={label}><Button variant="ghost" size="icon" aria-label={label} {...props}>{children}</Button></Tip>;}
export const TooltipProvider=TooltipPrimitive.Provider;
export function Slider({label,className,...props}:React.ComponentProps<typeof SliderPrimitive.Root>&{label:string}){return <SliderPrimitive.Root className={cn('slider',className)} {...props}><SliderPrimitive.Track className="slider-track"><SliderPrimitive.Range className="slider-range"/></SliderPrimitive.Track><SliderPrimitive.Thumb className="slider-thumb" aria-label={label}/></SliderPrimitive.Root>;}
export const Input=React.forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>(({className,...props},ref)=><input ref={ref} className={cn('input',className)} {...props}/>);
export const Dialog=DialogPrimitive.Root;
export function DialogContent({title,description,children,className,descriptionClassName,headerActions,leading}:{title:string;description:string;children:React.ReactNode;className?:string;descriptionClassName?:string;headerActions?:React.ReactNode;leading?:React.ReactNode}){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className={cn('dialog-content',className)}><div className="dialog-heading">{leading}<DialogPrimitive.Title>{title}</DialogPrimitive.Title>{headerActions}<DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="Close dialog"><X size={18}/></Button></DialogPrimitive.Close></div><DialogPrimitive.Description className={cn('dialog-description',descriptionClassName)}>{description}</DialogPrimitive.Description>{children}</DialogPrimitive.Content></DialogPrimitive.Portal>;}
export const DropdownMenu=DropdownPrimitive.Root;
export const DropdownMenuTrigger=DropdownPrimitive.Trigger;
export function DropdownMenuContent({children}: {children:React.ReactNode}){return <DropdownPrimitive.Portal><DropdownPrimitive.Content className="dropdown-content" align="end" sideOffset={8}>{children}</DropdownPrimitive.Content></DropdownPrimitive.Portal>;}
export function DropdownMenuItem({children,...props}:React.ComponentProps<typeof DropdownPrimitive.Item>){return <DropdownPrimitive.Item className="dropdown-item" {...props}>{children}</DropdownPrimitive.Item>;}
