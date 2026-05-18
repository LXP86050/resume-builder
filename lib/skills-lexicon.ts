// Curated lexicon for keyword recognition. Each entry maps canonical form to aliases.
// Used by JD parser (to extract real skills, not generic nouns) and the ATS scorer
// (to credit a resume for "JS" when the JD says "JavaScript", etc.).
export const SKILL_ALIASES: Record<string, string[]> = {
  // Languages
  JavaScript: ["javascript", "js", "ecmascript", "es6", "es2015"],
  TypeScript: ["typescript", "ts"],
  Python: ["python", "py", "python3"],
  Java: ["java"],
  "C#": ["c#", "csharp", "c sharp"],
  "C++": ["c++", "cpp"],
  Go: ["golang", "go lang"],
  Rust: ["rust"],
  Ruby: ["ruby"],
  PHP: ["php"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  Scala: ["scala"],
  R: ["r language", "rlang"],
  SQL: ["sql", "t-sql", "pl/sql", "plsql"],
  Bash: ["bash", "shell scripting", "shell"],
  PowerShell: ["powershell"],

  // Frontend
  React: ["react", "reactjs", "react.js"],
  "Next.js": ["next.js", "nextjs", "next js"],
  Vue: ["vue", "vuejs", "vue.js"],
  Angular: ["angular", "angularjs"],
  Svelte: ["svelte", "sveltekit"],
  Redux: ["redux"],
  "Tailwind CSS": ["tailwind", "tailwindcss"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  Sass: ["sass", "scss"],
  "Fluent UI": ["fluent ui", "fluentui"],
  "Material UI": ["material ui", "mui", "material-ui"],
  jQuery: ["jquery"],

  // Backend / API
  "Node.js": ["node.js", "nodejs", "node"],
  Express: ["express", "expressjs", "express.js"],
  Django: ["django"],
  Flask: ["flask"],
  FastAPI: ["fastapi", "fast api"],
  "Spring Boot": ["spring boot", "spring"],
  ".NET": [".net", "dotnet", ".net core", ".net 6", ".net 7", ".net 8"],
  "ASP.NET": ["asp.net", "asp net"],
  GraphQL: ["graphql"],
  REST: ["rest", "restful", "rest api"],
  gRPC: ["grpc"],
  WebSockets: ["websockets", "websocket"],

  // Databases
  PostgreSQL: ["postgres", "postgresql", "psql"],
  MySQL: ["mysql"],
  "SQL Server": ["sql server", "mssql", "ms sql"],
  Oracle: ["oracle"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  "Cosmos DB": ["cosmos db", "cosmosdb"],
  DynamoDB: ["dynamodb", "dynamo"],
  Elasticsearch: ["elasticsearch", "elastic search", "elk"],
  Cassandra: ["cassandra"],
  Snowflake: ["snowflake"],
  BigQuery: ["bigquery", "big query"],

  // Cloud
  AWS: ["aws", "amazon web services"],
  Azure: ["azure", "microsoft azure"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Lambda: ["aws lambda", "lambda"],
  S3: ["s3"],
  EC2: ["ec2"],
  AKS: ["aks", "azure kubernetes service"],
  EKS: ["eks"],
  GKE: ["gke"],
  "Azure Functions": ["azure functions"],
  "Azure DevOps": ["azure devops", "ado"],
  "Azure OpenAI": ["azure openai", "azure open ai"],
  "Azure AI Search": ["azure ai search", "azure cognitive search"],

  // DevOps / Infra
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  Bicep: ["bicep"],
  Ansible: ["ansible"],
  Jenkins: ["jenkins"],
  "GitHub Actions": ["github actions", "gha"],
  GitLab: ["gitlab", "gitlab ci"],
  CircleCI: ["circleci", "circle ci"],
  ArgoCD: ["argocd", "argo cd"],
  Helm: ["helm"],
  Prometheus: ["prometheus"],
  Grafana: ["grafana"],
  Datadog: ["datadog"],
  Splunk: ["splunk"],
  "New Relic": ["new relic", "newrelic"],
  Kafka: ["kafka", "apache kafka"],
  "RabbitMQ": ["rabbitmq", "rabbit mq"],

  // AI / ML
  LLM: ["llm", "large language model", "large language models"],
  RAG: ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
  LangChain: ["langchain", "lang chain"],
  LlamaIndex: ["llamaindex", "llama index"],
  OpenAI: ["openai", "open ai", "gpt-4", "gpt-3", "gpt4", "chatgpt"],
  "Vector Search": ["vector search", "vector database", "vector db", "embeddings"],
  Pinecone: ["pinecone"],
  Weaviate: ["weaviate"],
  Chroma: ["chroma", "chromadb"],
  Milvus: ["milvus"],
  "PyTorch": ["pytorch", "torch"],
  TensorFlow: ["tensorflow", "tf"],
  "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
  pandas: ["pandas"],
  NumPy: ["numpy"],
  HuggingFace: ["huggingface", "hugging face"],
  "Machine Learning": ["machine learning", "ml"],
  "Deep Learning": ["deep learning"],
  NLP: ["nlp", "natural language processing"],
  "Computer Vision": ["computer vision", "cv"],
  MLOps: ["mlops", "ml ops"],

  // Concepts / methodologies
  Microservices: ["microservices", "micro services"],
  "Event-Driven": ["event driven", "event-driven"],
  CI: ["ci", "continuous integration"],
  CD: ["cd", "continuous deployment", "continuous delivery"],
  "CI/CD": ["ci/cd", "cicd"],
  Agile: ["agile"],
  Scrum: ["scrum"],
  Kanban: ["kanban"],
  TDD: ["tdd", "test driven development", "test-driven development"],
  DDD: ["ddd", "domain driven design"],
  OOP: ["oop", "object oriented programming"],
  "Design Patterns": ["design patterns"],
  "System Design": ["system design"],
  "Distributed Systems": ["distributed systems"],

  // Testing
  Jest: ["jest"],
  Mocha: ["mocha"],
  Cypress: ["cypress"],
  Playwright: ["playwright"],
  Selenium: ["selenium"],
  pytest: ["pytest"],
  JUnit: ["junit"],
  xUnit: ["xunit"],

  // Tools
  Git: ["git"],
  GitHub: ["github"],
  Bitbucket: ["bitbucket"],
  Jira: ["jira"],
  Confluence: ["confluence"],
  Linux: ["linux"],
  Unix: ["unix"],
  "VS Code": ["vs code", "vscode", "visual studio code"],

  // Security
  OAuth: ["oauth", "oauth2", "oauth 2.0"],
  JWT: ["jwt", "json web token"],
  SAML: ["saml"],
  OWASP: ["owasp"],
};

export const SOFT_SKILLS = [
  "communication",
  "leadership",
  "collaboration",
  "problem solving",
  "problem-solving",
  "mentoring",
  "mentorship",
  "ownership",
  "cross-functional",
  "cross functional",
  "stakeholder",
  "stakeholders",
  "documentation",
  "presentation",
  "analytical",
  "detail-oriented",
  "self-starter",
  "fast-paced",
  "ambiguity",
  "scalable",
  "high-impact",
];

export const ACTION_VERBS = [
  "architected",
  "built",
  "designed",
  "developed",
  "implemented",
  "led",
  "drove",
  "delivered",
  "shipped",
  "launched",
  "owned",
  "optimized",
  "improved",
  "reduced",
  "increased",
  "automated",
  "migrated",
  "refactored",
  "engineered",
  "scaled",
  "integrated",
  "deployed",
  "orchestrated",
  "spearheaded",
  "established",
  "introduced",
  "rolled out",
  "modernized",
  "consolidated",
  "streamlined",
  "mentored",
  "coordinated",
  "collaborated",
  "partnered",
  "researched",
  "analyzed",
  "investigated",
  "evaluated",
  "benchmarked",
  "instrumented",
  "monitored",
  "secured",
  "hardened",
  "documented",
  "presented",
  "negotiated",
];

// Reverse lookup: alias (lowercased) → canonical
let _reverse: Map<string, string> | null = null;
export function aliasMap(): Map<string, string> {
  if (_reverse) return _reverse;
  const m = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    m.set(canonical.toLowerCase(), canonical);
    for (const a of aliases) m.set(a.toLowerCase(), canonical);
  }
  _reverse = m;
  return m;
}

// All canonical skill names sorted by length descending (so longer matches win).
let _canonicals: string[] | null = null;
export function allCanonicalSkills(): string[] {
  if (_canonicals) return _canonicals;
  _canonicals = Object.keys(SKILL_ALIASES).sort((a, b) => b.length - a.length);
  return _canonicals;
}
