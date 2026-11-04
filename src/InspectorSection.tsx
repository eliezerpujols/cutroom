import React from 'react';

/** Shared section structure for clip, text and caption property groups. */
export function InspectorSection({title,children,className=''}:{title:string;children:React.ReactNode;className?:string}){
  return <section className={`inspector-section property-section ${className}`} aria-label={title}><div className="section-title"><h3>{title}</h3></div>{children}</section>;
}
