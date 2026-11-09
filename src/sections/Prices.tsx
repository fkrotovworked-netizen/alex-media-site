import { motion, useTransform } from 'motion/react';
import { useState } from 'react';
import { BorderBeam } from '../components/BorderBeam';
import { CasesFolder } from '../components/CasesFolder';
import { cases } from '../cases';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { chooseService } from '../lead';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Prices.css';

/**
 * Prices «from», with a request on each: the form opens already knowing the service.
 * The most common one is a piece of black acrylic set into the paper.
 */
export const Prices = () => {
  const { label, title, lead, from, request, popular, folder, confirm, items, budget, budgetConfirm, pick } =
    content.prices;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLDivElement>({ duration: 1 });
  const sheetY = useTransform(sheet.progress, (p) => (1 - clamp01(p * 1.4)) * 24);
  // the tariff under the mouse (or holding focus) gets a band of light round its edge; touch never does
  const [lit, setLit] = useState<string | null>(null);

  return (
    <Sheet id="prices" className="prices">
      <div className="wrap block">
        <div ref={head.ref}>
          <SectionHead className="head--split" label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <motion.div ref={sheet.ref} className="price-sheet" style={{ opacity: sheet.progress, y: sheetY }}>
          {items.map((item) => {
            const filed = item.cases.map((name) => cases.find((c) => c.name === name)).filter((c) => c !== undefined);
            return (
              <article
                key={item.id}
                id={`price-${item.id}`}
                className={`price${item.popular ? ' price--popular acrylic' : ''}${lit === item.id ? ' price--lit' : ''}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setLit(item.id)}
                onPointerLeave={() => setLit((id) => (id === item.id ? null : id))}
                onFocus={() => setLit(item.id)}
                onBlur={() => setLit((id) => (id === item.id ? null : id))}
              >
                <header className="price__head">
                  <h3 className="price__name">{item.name}</h3>
                  {item.popular ? <span className="tag tag--lit">{popular}</span> : null}
                </header>
                <p className="price__value">
                  {item.per ? (
                    <>
                      <span className="price__from">{from}</span> {item.price}{' '}
                      <span className="price__per">{item.per}</span>
                    </>
                  ) : (
                    <span className="price__word">{item.price}</span>
                  )}
                </p>
                {item.confirm ? <span className="confirm price__confirm">{confirm}</span> : null}
                <p className="price__text">{item.text}</p>
                <a
                  className={`btn btn--sm price__cta ${item.popular ? 'btn--lime' : 'btn--acrylic'}`}
                  href="#contact"
                  onClick={() => chooseService(item.service)}
                >
                  <span className="btn__label">{request}</span>
                </a>
                <BorderBeam active={lit === item.id} />
                {filed.length ? <CasesFolder open={lit === item.id} label={folder} files={filed} /> : null}
              </article>
            );
          })}
        </motion.div>

        <div className="prices__foot">
          <p className="prices__budget">
            {budget} {budgetConfirm ? <span className="confirm">{confirm}</span> : null}
          </p>
          <div className="pick acrylic">
            <p className="pick__copy">
              <strong>{pick.title}</strong> <span>{pick.text}</span>
            </p>
            <a className="btn btn--lime btn--sm" href="#contact" onClick={() => chooseService(pick.service)}>
              <span className="btn__label">{pick.cta}</span>
            </a>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
