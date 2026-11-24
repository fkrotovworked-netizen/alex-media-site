import { content } from '../content';
import './Footer.css';
import { asset } from '../asset';

const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {});

export const Footer = () => {
  const { about, contactsTitle, contacts, navTitle, legal, rights, requisites } = content.footer;

  return (
    <footer className="footer">
      <div className="footer__inner wrap">
        <div className="footer__brand">
          <a className="brand" href="#top">
            <img src={asset('brand/mark.webp')} alt="" width={240} height={111} loading="lazy" />
            <span className="brand__text">
              <span className="brand__name">{content.brand}</span>
              <span className="brand__note">{content.brandNote}</span>
            </span>
          </a>
          <p className="footer__about">{about}</p>
        </div>

        <nav className="footer__col" aria-label="Разделы">
          <h2 className="footer__title">{navTitle}</h2>
          <ul>
            {content.nav.links.map((link) => (
              <li key={link.label}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__col">
          <h2 className="footer__title">{contactsTitle}</h2>
          <ul>
            {contacts.map((item) => (
              <li key={item.label}>
                <span className="footer__key">{item.label}</span>
                <a href={item.href} {...external(item.href)}>
                  {item.value}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__base">
          <p>
            {rights} · {requisites}
          </p>
          <div className="footer__legal">
            {legal.map((doc) => (
              <a key={doc.href} href={asset(doc.href)}>
                {doc.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
