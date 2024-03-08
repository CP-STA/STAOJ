<script>
	import { formatTitle } from '$lib/utils';
	import SvelteMarkdown from 'svelte-markdown';
	const source = `

<h1 align="center">St Andrews Online Judge (STAOJ)</h1>
<h4 align="center">by Competitive Programming St Andrews (CPSTA)</h4>

<div id="badges" align="center">
  <a href="https://www.linkedin.com/company/competitive-programming-st-andrews/">
    <img src="https://img.shields.io/badge/LinkedIn-0077b5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.facebook.com/CompetitiveProgrammingStAndrews">
    <img src="https://img.shields.io/badge/Facebook-3b5998?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook Badge"/>
  </a>
  <a href="https://discord.gg/5FsjrdEwzE">
    <img src="https://img.shields.io/badge/discord-7289da?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Badge"/>
  </a>
  <a href="https://www.instagram.com/_cpsta_">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram Badge"/>
  </a>
  
</div>

<br/>

## Rules

- The points attainable from a problem problem is equal to the number of stars it has, which correlates to its difficulty.
- Problems with greater difficulty may contain subtasks with smaller constraints. You can gain partial score by solving those subtasks. So try to read all the problems to maximise your score!
- Your programme needs to read standard input and give the results as standard output.
- To users of languages that require explicit line break (e.g. C++), make sure you add it to the end of output; do 

\`\`\`
cout << sth << endl;
\`\`\`
 rather than 
\`\`\`
cout << sth;
\`\`\`
- To Java users, be careful about the specification of class name (follow template).
- You are allowed to use any resource you want, including Google, but you may not ask others or ChatGPT for help.

## Who are We?

We are a [society in St Andrews](https://www.yourunion.net/activities/societies/explore/9403/) formed by a group of passionate people whose main intention is to strengthen people's algorithmic and problem-solving skills. Our workshops and contests serve as preparation for competitive programming competitions and will help one ace technical coding interviews.

We are open to all irrespective of major or coding experience - the point is to learn and improve.

## The Contest

Check out [upcoming contest](/contest). It is a programming competition of approximately two or three hours where you solve fun and interesting programming problems. One of us typically sets all the problems for that contest.

## Past contests

You can see our [past problems](/past-problems) on this site. Our archive of past problems before this online judge was built can be found [here](https://github.com/STAOJ/St-Andrews-Competitive-Programming/blob/master/Competitions). Analysis, and in some cases, solutions and editorials can be found there. If not here, they can be found on the contest page itself (under the "Editorial" section), where test cases can also be downloaded.

## Past winners

The [past winners](/standings) are also on the site. For competitions before this online judge was built, the leaderboard for each contest can be found on the contest page itself.

## Support and sponsorships

In the past, we have worked with hackathons like Hack Quarantine ([Contest 11](https://github.com/STAOJ/St-Andrews-Competitive-Programming/blob/master/Competitions/Competition%2011%20%5B29%20March%202020%5D/readme.md) and [Contest 12](https://github.com/STAOJ/St-Andrews-Competitive-Programming/blob/master/Competitions/Competition%2012%20%5B5%20Apr%202020%5D/readme.md)) and The Open Code Foundation ([Contest 19](https://github.com/STAOJ/St-Andrews-Competitive-Programming/blob/master/Competitions/Competition%2019%20%5B24%20May%202020%5D/readme.md)).

Upon request, we can create custom contests for hackathons and organisations, and possibly provide other support as well (like workshops and talks). For more information about us and potential sponsorship opportunities, feel free to email  [cpsta@st-andrews.ac.uk](mailto:cpsta@st-andrews.ac.uk)

## The Team

Currently consists of seven St Andrews students from around the world. Learn more about the members that power this society [here](https://github.com/STAOJ/St-Andrews-Competitive-Programming/blob/master/the_team.md).

**Accessibility issues?** If you have a condition (eg visually impaired, or even otherwise) that you think is causing you difficulty in taking part in any of our events or contests, please let [cpsta@st-andrews.ac.uk](mailto:cpsta@st-andrews.ac.uk) know. We'll do what we can to ensure that you can take part in all our events.

`;
</script>

<svelte:head>
	<title>St Andrews Online Judge</title>
</svelte:head>
<img
	src="https://raw.githubusercontent.com/CP-STA/STAOJ/master/OnlineJudgedark.png"
	class="rounded mx-auto d-block"
	alt="CPSTA Logo"
	width="192"
	height="192"
/>
<SvelteMarkdown {source} />
