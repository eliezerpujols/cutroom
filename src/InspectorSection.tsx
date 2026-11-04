import React from 'react';

/** Shared section structure for clip, text and caption property groups. */
export function InspectorSection({title,children,className='',actions}:{title:string;children:React.ReactNode;className?:string;actions?:React.ReactNode}){
  return <section className={`inspector-section property-section ${className}`} aria-label={title}><div className="section-title"><h3>{title}</h3>{actions}</div>{children}</section>;
}
