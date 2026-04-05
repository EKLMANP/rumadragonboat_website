
import React from 'react';

export default function NewsContentRenderer({ content }) {
    if (!content || !Array.isArray(content)) return null;

    const renderTextWithLinks = (text) => {
        if (!text) return null;

        // Step 1: Strip HTML tags and convert common HTML to readable text
        const cleanText = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1')
            .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<ul[^>]*>|<\/ul>/gi, '')
            .replace(/<ol[^>]*>|<\/ol>/gi, '')
            .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags

        // Step 2: Parse markdown bold and links
        return cleanText.split(/(\*\*.*?\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
            // Check for Bold
            const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
            if (boldMatch) {
                return <strong key={i} className="font-bold text-white">{boldMatch[1]}</strong>;
            }

            // Check for Link
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                const url = linkMatch[2];
                const isInternal = url.startsWith('#');
                const target = isInternal ? undefined : "_blank";
                const rel = isInternal ? undefined : "noopener noreferrer";

                return (
                    <a
                        key={i}
                        href={url}
                        target={target}
                        rel={rel}
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
                    <p key={index} className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
                        {renderTextWithLinks(block.text)}
                    </p>
                );
            case 'heading':
                const HeadingTag = block.level === 'h3' ? 'h3' : 'h2';
                const headingClass = block.level === 'h3'
                    ? 'font-display font-bold text-xl text-white mt-6 mb-3'
                    : 'font-display font-bold text-2xl text-white mt-8 mb-4';
                return (
                    <HeadingTag key={index} id={block.id} className={headingClass}>
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
                            loading="lazy"
                            decoding="async"
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
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                );
            case 'quote':
                return (
                    <blockquote key={index} className="border-l-4 border-red-600 pl-6 py-2 my-8 italic">
                        <p className="text-xl text-red-400 font-medium">
                            "{renderTextWithLinks(block.text)}"
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
                            <li key={i}>{renderTextWithLinks(typeof item === 'string' ? item : item.text)}</li>
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
            case 'details':
                return (
                    <details key={index} className="my-6 group bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                        <summary className="flex items-center justify-between cursor-pointer p-4 font-bold text-white hover:bg-gray-700 transition">
                            {renderTextWithLinks(block.summary)}
                            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-4 border-t border-gray-700 text-gray-300 whitespace-pre-line">
                            {renderTextWithLinks(block.content)}
                        </div>
                    </details>
                );
            default:
                return null;
        }
    });
}
