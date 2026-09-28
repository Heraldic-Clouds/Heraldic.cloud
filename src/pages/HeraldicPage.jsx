import { useState } from 'react';

const companyHistory = [
  {
    year: '2013', title: 'Born In The Cloud', image: 'mea-effect.jpg', alt: 'Early Mise En Abyme cloud-computing concept artwork',
    caption: 'Mise En Abyme and Heraldic were founded by Artem D.',
    paragraphs: [
      'In 2013, after learning about virtualization and remote desktop technologies, Artem, then a Valencia College student, came up with an idea for an invention: Mise En Abyme Cloud Computers. Virtual desktops streamed over the Internet on any device! Artem’s mind was blown at the potential of MEA, and he got to work on a prototype with a fanatic’s zeal.',
    ],
  },
  {
    year: '2014', title: 'Garage Lab', image: 'MEApresentationinValencia.png', alt: 'Mise En Abyme presentation at Valencia College',
    paragraphs: [
      'Mise En Abyme had humble beginnings in a garage, following in the footsteps of Google and HP. In 2014, Artem set up a few testing VM servers in his garage. During his first semester at Valencia College, Artem used these virtual machines in class to code and execute programs from an iPad, a functionality previously unheard of on mobile devices.',
    ],
  },
  {
    year: '2015', title: 'Kickstarter', video: true,
    paragraphs: [
      'In May 2015, we decided it was time for our first crowdfunding campaign on Kickstarter to raise money to build Mise En Abyme servers. We made a viral video explaining Mise En Abyme concepts through Internet memes and Internet-culture parody. Our Kickstarter did not reach the ambitious goal we had set, so we decided it was time to move to AWS instead of hosting on-premises.',
      'That same year, Mise En Abyme was presented at the Code for the Kingdom hackathon at Wycliffe Associates headquarters in Orlando, Florida.',
    ],
  },
  {
    year: '2016', title: 'Public Beta', image: 'mea-beta-2016.jpg', alt: 'Mise En Abyme 2016 public beta',
    paragraphs: [
      'In 2016, after migrating our infrastructure to AWS, we released the second public beta test for Mise En Abyme. It eventually formed the MEA Newbie edition.',
    ],
  },
  {
    year: '2017', title: 'MEA Released', image: 'artem-sme.jpg', alt: 'Artem D. recognized as a cloud technologies subject matter expert',
    paragraphs: [
      'In 2017, ApostleMod was renamed Heraldic, and Heraldic Clouds LLC was formed in Florida.',
      'On January 1, 2017, Heraldic released its first mobile app, an MEA Android client. After Mise En Abyme reached Android users, its popularity grew rapidly.',
      'Because of Heraldic’s cloud-technology expertise and focus, CEO Artem worked with CompTIA as a Subject Matter Expert to develop Cloud+ exam questions.',
      'In May 2017, Heraldic presented a graphics-virtualization poster at NVIDIA GTC in San Jose, California. At the convention, Heraldic revealed three phases of Mise En Abyme and its use of GPUs.',
    ],
  },
  {
    year: '2018', title: 'MEA Reached 50,000 Downloads on Google Play', image: 'ArtemHeraldicCEOAtGTC2017.jpg', alt: 'Artem D. at NVIDIA GTC 2017',
    paragraphs: [
      'The Mise En Abyme app was further improved. Heraldic began conducting a beta test of the new GPU-accelerated cloud desktop service Eleet.',
      'Heraldic’s new research poster was accepted to NVIDIA GTC for a second year in a row. The poster explored containerization of entire GPU-accelerated desktops in Amazon Web Services EC2.',
    ],
  },
  {
    year: '2019–2026', title: 'Transition to AI', image: 'pplwlcome.jpg', alt: 'People welcoming the next chapter in Heraldic technology',
    paragraphs: [
      'As Heraldic grew, it branched out into AI and blockchain services. In 2026, AI is at a crossroads, and exciting things are coming very soon, one after another.',
      'To be continued…',
    ],
  },
];

function KickstarterVideo() {
  const [playerRequested, setPlayerRequested] = useState(false);
  return <div className="history-video">
    {playerRequested
      ? <iframe title="Promo for MEA Cloud Computers’ Kickstarter" src="https://www.youtube-nocookie.com/embed/LxbTRD6vw9I" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
      : <button type="button" onClick={() => setPlayerRequested(true)}>Load and play: Promo for MEA Cloud Computers’ Kickstarter <span aria-hidden="true">↗</span></button>}
    <p>The YouTube player loads only after you choose to play the video.</p>
  </div>;
}

export default function HeraldicPage() {
  return <section className="screen-section heraldic-page">
    <p className="eyebrow">About Heraldic</p>
    <h1>Our history</h1>
    <p className="lede">HERALDIC is an American Desktop-as-a-Service company.</p>
    <div className="company-history">{companyHistory.map((milestone) => <article className="history-milestone" key={milestone.year}>
      <div className="history-date"><span>{milestone.year}</span></div>
      <div className="history-content">
        <h2>{milestone.title}</h2>
        {milestone.image && <figure><img src={`/mea/${milestone.image}`} alt={milestone.alt} loading="lazy" decoding="async" />{milestone.caption && <figcaption>{milestone.caption}</figcaption>}</figure>}
        {milestone.video && <KickstarterVideo />}
        {milestone.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>)}</div>
  </section>;
}
