
import React from 'react';

export default function NewsContentRenderer({ content }) {
    if (!content || !Array.isArray(content)) return null;

    const renderTextWithLinks = (text) => {
        if (!text) return null;
        return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
            const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                return (
                    <a
                        key={i}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 underline"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }
            return part;
        });
    };

    return content.map((block, index) => {
        switch (block.type) {
            case 'paragraph':
                return (
                    <p key={index} className="text-gray-300 leading-relaxed mb-6">
                        {renderTextWithLinks(block.text)}
                    </p>
                );
            case 'heading':
                const HeadingTag = block.level === 'h3' ? 'h3' : 'h2';
                const headingClass = block.level === 'h3'
                    ? 'font-display font-bold text-xl text-white mt-6 mb-3'
                    : 'font-display font-bold text-2xl text-white mt-8 mb-4';
                return (
                    <HeadingTag key={index} className={headingClass}>
                        {block.text}
                    </HeadingTag>
                );
            case 'image':
                return (
                    <figure key={index} className="my-8">
                        <img
                            src={block.url}
                            alt={block.alt || block.caption || ''}
                            referrerPolicy="no-referrer"
                            className="w-full rounded-lg"
                        />
                        {block.caption && (
                            <figcaption className="text-center text-gray-500 text-sm mt-2">
                                {block.caption}
                            </figcaption>
                        )}
                    </figure>
                );
            case 'video':
                return (
                    <div key={index} className="my-8 aspect-video">
                        <iframe
                            src={block.url}
                            title={block.caption || 'Video'}
                            className="w-full h-full rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );
            case 'quote':
                return (
                    <blockquote key={index} className="border-l-4 border-red-600 pl-6 py-2 my-8 italic">
                        <p className="text-xl text-red-400 font-medium">
                            "{block.text}"
                        </p>
                        {block.author && (
                            <cite className="text-gray-500 not-italic mt-2 block">
                                — {block.author}
                            </cite>
                        )}
                    </blockquote>
                );
            case 'list':
                return (
                    <ul key={index} className="list-disc list-inside space-y-2 mb-6 text-gray-300">
                        {block.items?.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                );
            case 'link':
                return (
                    <a
                        key={index}
                        href={block.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-red-500 hover:text-red-400 underline mb-4"
                    >
                        {block.text || block.url}
                    </a>
                );
            default:
                return null;
        }
    });
}
