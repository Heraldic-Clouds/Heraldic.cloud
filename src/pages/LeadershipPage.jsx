export default function LeadershipPage({ copy }) {
  return <section className="screen-section leadership-page">
    <h1>{copy.leadershipTitle}</h1>
    <article className="leader-profile"><img src="/mea/profile.jpeg" alt="Portrait of Artem D." width="320" height="320" fetchPriority="high" /><div><h2>Artem D.</h2><p>{copy.leadershipBio}</p><p><a href="https://www.linkedin.com/in/artemdmitrievcloud" target="_blank" rel="noopener noreferrer">Connect with Artem on LinkedIn</a></p></div></article>
  </section>;
}
