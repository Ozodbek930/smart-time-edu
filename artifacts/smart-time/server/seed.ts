import { storage } from "./storage";

export async function seedData() {
  const existingTests = await storage.getSpeakingTests();
  if (existingTests.length > 0) {
    console.log("Seed data already exists, skipping...");
    return;
  }

  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    await storage.createUser({
      username: "admin",
      password: "admin123",
      fullName: "Administrator",
      parentPhone: "+998000000000",
    });
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(users).set({ isAdmin: true }).where(eq(users.username, "admin"));
  }

  await storage.createSpeakingTest({
    title: "Home & Accommodation",
    part: 1,
    topic: "Home & Living",
    description: "Common Part 1 questions about your home, neighborhood, and living situation.",
    difficulty: "Easy",
    duration: 5,
    questions: [
      "Do you live in a house or an apartment?",
      "What is your favorite room in your home? Why?",
      "How long have you lived in your current home?",
      "What do you like most about your neighborhood?",
      "Would you like to move to a different place in the future?",
    ],
    tips: [
      "Give extended answers with reasons and examples.",
      "Use a range of vocabulary related to housing and neighborhoods.",
      "Practice using present perfect tense for duration (I have lived here for...).",
    ],
  });

  await storage.createSpeakingTest({
    title: "Work & Studies",
    part: 1,
    topic: "Career & Education",
    description: "Frequently asked questions about your job or studies in Part 1.",
    difficulty: "Easy",
    duration: 5,
    questions: [
      "Do you work or are you a student?",
      "What do you study / What is your job?",
      "Why did you choose this field of study / career?",
      "What do you enjoy most about your work / studies?",
      "Do you plan to continue in this field in the future?",
    ],
    tips: [
      "Be honest and specific about your experiences.",
      "Use conditional sentences when talking about future plans.",
      "Show enthusiasm when discussing what you enjoy.",
    ],
  });

  await storage.createSpeakingTest({
    title: "Hobbies & Free Time",
    part: 1,
    topic: "Leisure Activities",
    description: "Questions about how you spend your free time and your interests.",
    difficulty: "Easy",
    duration: 5,
    questions: [
      "What do you usually do in your free time?",
      "Do you have any hobbies?",
      "How much time do you spend on your hobbies each week?",
      "Is there a hobby you would like to try in the future?",
      "Do you prefer indoor or outdoor activities? Why?",
    ],
    tips: [
      "Use frequency adverbs (always, usually, sometimes, rarely).",
      "Give specific examples of activities you enjoy.",
      "Compare past and present hobbies if relevant.",
    ],
  });

  await storage.createSpeakingTest({
    title: "Describe a Book You Recently Read",
    part: 2,
    topic: "Books & Reading",
    description: "Describe a book that you have recently read. You should say what the book was about, why you decided to read it, and what you learned from it.",
    difficulty: "Medium",
    duration: 3,
    questions: [
      "What is the title of the book?",
      "What is the book about?",
      "Why did you decide to read this book?",
      "How did you feel while reading it?",
      "Would you recommend this book to others? Why?",
    ],
    tips: [
      "Structure your answer: Introduction, Main points, Conclusion.",
      "Use past tense consistently when describing the story.",
      "Include your personal feelings and reactions to make it more engaging.",
      "Practice speaking for 2 minutes - time yourself.",
    ],
  });

  await storage.createSpeakingTest({
    title: "Describe a Place You Would Like to Visit",
    part: 2,
    topic: "Travel & Places",
    description: "Talk about a place you have never been to but would like to visit. Explain where it is, what you know about it, and why you want to go there.",
    difficulty: "Medium",
    duration: 3,
    questions: [
      "Where is this place?",
      "How did you first learn about this place?",
      "What would you like to do there?",
      "Why do you want to visit this place?",
      "When do you plan to go there?",
    ],
    tips: [
      "Use would like to / want to for expressing desires.",
      "Describe the place vividly using adjectives.",
      "Mention cultural aspects or unique features of the destination.",
      "Connect your interest to personal experiences or values.",
    ],
  });

  await storage.createSpeakingTest({
    title: "Describe a Skill You Learned Recently",
    part: 2,
    topic: "Personal Development",
    description: "Talk about a new skill you have learned. Explain what it is, how you learned it, and how it has been useful.",
    difficulty: "Medium",
    duration: 3,
    questions: [
      "What skill did you learn?",
      "When and how did you learn this skill?",
      "Was it difficult to learn? Why or why not?",
      "How has this skill been useful to you?",
      "Do you plan to develop this skill further?",
    ],
    tips: [
      "Use a mix of past simple and present perfect tenses.",
      "Include specific details about the learning process.",
      "Explain both challenges and achievements.",
      "Show reflection on personal growth.",
    ],
  });

  await storage.createSpeakingTest({
    title: "Technology & Society",
    part: 3,
    topic: "Modern Technology",
    description: "Discussion questions about how technology affects our daily lives, education, and society.",
    difficulty: "Hard",
    duration: 5,
    questions: [
      "How has technology changed the way people communicate?",
      "Do you think children spend too much time using technology?",
      "What are the advantages and disadvantages of online education?",
      "How might artificial intelligence change the job market in the future?",
      "Should governments regulate social media? Why or why not?",
    ],
    tips: [
      "Give balanced arguments showing both sides of an issue.",
      "Use complex sentence structures and linking words.",
      "Support your opinions with examples from real life.",
      "Use hedging language: tend to, might, it could be argued that...",
    ],
  });

  await storage.createSpeakingTest({
    title: "Environment & Climate",
    part: 3,
    topic: "Environmental Issues",
    description: "In-depth questions about environmental problems, sustainability, and individual responsibility.",
    difficulty: "Hard",
    duration: 5,
    questions: [
      "What are the biggest environmental challenges facing your country?",
      "Do you think individuals can make a difference in protecting the environment?",
      "How effective are government policies in addressing climate change?",
      "Should companies be held responsible for their environmental impact?",
      "What changes do you think we will see in energy use over the next 20 years?",
    ],
    tips: [
      "Use conditional structures for hypothetical situations.",
      "Demonstrate awareness of global issues.",
      "Use topic-specific vocabulary: sustainability, carbon footprint, renewable energy.",
      "Practice giving extended, well-structured responses with clear reasoning.",
    ],
  });

  await storage.createListeningTest({
    title: "Hotel Booking Conversation",
    section: 1,
    topic: "Travel & Accommodation",
    description: "A conversation between a customer and a hotel receptionist about booking a room for a holiday stay.",
    difficulty: "Easy",
    duration: 8,
    questions: [
      { id: 1, question: "What type of room does the customer want to book?", options: ["Single room", "Double room", "Family suite", "Twin room"], correctAnswer: 1 },
      { id: 2, question: "How many nights will the customer stay?", options: ["3 nights", "5 nights", "7 nights", "10 nights"], correctAnswer: 2 },
      { id: 3, question: "What is included in the room price?", options: ["Lunch only", "Dinner only", "Breakfast only", "All meals"], correctAnswer: 2 },
      { id: 4, question: "What special request does the customer make?", options: ["Late check-out", "Airport transfer", "Extra pillows", "Sea view room"], correctAnswer: 3 },
    ],
  });

  await storage.createListeningTest({
    title: "Library Registration",
    section: 1,
    topic: "Education & Services",
    description: "A new student registers at the university library and asks about available services and borrowing rules.",
    difficulty: "Easy",
    duration: 7,
    questions: [
      { id: 1, question: "How many books can students borrow at one time?", options: ["3 books", "5 books", "8 books", "10 books"], correctAnswer: 1 },
      { id: 2, question: "What is the loan period for standard books?", options: ["1 week", "2 weeks", "3 weeks", "4 weeks"], correctAnswer: 2 },
      { id: 3, question: "What does the student need to bring for registration?", options: ["Passport only", "Student ID and proof of address", "Birth certificate", "Library card from previous institution"], correctAnswer: 1 },
      { id: 4, question: "When is the library closed?", options: ["Monday mornings", "Saturday afternoons", "Sundays", "Public holidays only"], correctAnswer: 2 },
    ],
  });

  await storage.createListeningTest({
    title: "Museum Tour Guide",
    section: 2,
    topic: "Culture & Tourism",
    description: "A museum tour guide explains the history and layout of a national art museum to a group of visitors.",
    difficulty: "Medium",
    duration: 10,
    questions: [
      { id: 1, question: "When was the museum originally built?", options: ["1820", "1856", "1903", "1945"], correctAnswer: 1 },
      { id: 2, question: "Which collection is on the second floor?", options: ["Ancient sculptures", "Modern photography", "Renaissance paintings", "Contemporary art"], correctAnswer: 2 },
      { id: 3, question: "What is NOT allowed inside the gallery?", options: ["Taking notes", "Using audio guides", "Flash photography", "Wearing backpacks"], correctAnswer: 2 },
      { id: 4, question: "How long does the guided tour last?", options: ["30 minutes", "1 hour", "90 minutes", "2 hours"], correctAnswer: 2 },
      { id: 5, question: "Where is the gift shop located?", options: ["First floor near entrance", "Second floor east wing", "Basement level", "Third floor"], correctAnswer: 0 },
    ],
  });

  await storage.createListeningTest({
    title: "City Transport Information",
    section: 2,
    topic: "Urban Life",
    description: "An announcement about changes to the city bus and train services, including new routes and schedules.",
    difficulty: "Medium",
    duration: 9,
    questions: [
      { id: 1, question: "Which bus route is being discontinued?", options: ["Route 12", "Route 27", "Route 34", "Route 45"], correctAnswer: 1 },
      { id: 2, question: "What time does the new express train service start?", options: ["6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM"], correctAnswer: 2 },
      { id: 3, question: "How much will the monthly pass cost after the change?", options: ["$45", "$55", "$65", "$75"], correctAnswer: 2 },
      { id: 4, question: "Where can passengers get the new timetable?", options: ["Online only", "Any station or online", "By calling customer service", "At the main bus depot"], correctAnswer: 1 },
    ],
  });

  await storage.createListeningTest({
    title: "Research Project Discussion",
    section: 3,
    topic: "Academic Studies",
    description: "Three students discuss their group research project on renewable energy sources for their environmental science course.",
    difficulty: "Hard",
    duration: 12,
    questions: [
      { id: 1, question: "What is the main topic of their research project?", options: ["Nuclear energy", "Solar and wind energy comparison", "Ocean pollution", "Deforestation effects"], correctAnswer: 1 },
      { id: 2, question: "When is the project deadline?", options: ["Next Monday", "In two weeks", "End of the month", "Next semester"], correctAnswer: 2 },
      { id: 3, question: "What research method will they primarily use?", options: ["Laboratory experiments", "Surveys and interviews", "Case studies and data analysis", "Field observations"], correctAnswer: 2 },
      { id: 4, question: "Who will be responsible for the presentation slides?", options: ["Sarah", "David", "Emma", "The whole group together"], correctAnswer: 0 },
      { id: 5, question: "What concern does one student raise about the project?", options: ["Lack of data", "Time constraints", "Difficulty of the topic", "Group conflicts"], correctAnswer: 1 },
    ],
  });

  await storage.createListeningTest({
    title: "Lecture: Marine Biology",
    section: 4,
    topic: "Science & Nature",
    description: "A university lecture about the impact of ocean temperature changes on coral reef ecosystems and biodiversity.",
    difficulty: "Hard",
    duration: 15,
    questions: [
      { id: 1, question: "What percentage of marine species depend on coral reefs?", options: ["10%", "25%", "40%", "50%"], correctAnswer: 1 },
      { id: 2, question: "What is coral bleaching caused by?", options: ["Pollution from ships", "Rising water temperatures", "Overfishing", "UV radiation"], correctAnswer: 1 },
      { id: 3, question: "Which ocean has experienced the most severe bleaching events?", options: ["Atlantic Ocean", "Arctic Ocean", "Indian Ocean", "Pacific Ocean"], correctAnswer: 3 },
      { id: 4, question: "What solution does the lecturer suggest is most promising?", options: ["Building artificial reefs", "Reducing carbon emissions", "Relocating marine species", "Increasing fishing regulations"], correctAnswer: 1 },
      { id: 5, question: "By what year does the lecturer predict major changes if no action is taken?", options: ["2030", "2040", "2050", "2100"], correctAnswer: 2 },
    ],
  });

  await storage.createListeningTest({
    title: "Lecture: Urban Planning History",
    section: 4,
    topic: "Architecture & Cities",
    description: "An academic lecture exploring how urban planning has evolved from ancient civilizations to modern smart cities.",
    difficulty: "Hard",
    duration: 14,
    questions: [
      { id: 1, question: "Which ancient civilization is mentioned as having the first organized city plans?", options: ["Egyptian", "Roman", "Indus Valley", "Greek"], correctAnswer: 2 },
      { id: 2, question: "What was the main purpose of the garden city movement?", options: ["Create luxury housing", "Combine urban and rural living", "Build more factories", "Improve military defense"], correctAnswer: 1 },
      { id: 3, question: "What technology is central to modern smart cities?", options: ["Solar panels", "Self-driving cars", "Internet of Things (IoT)", "Nuclear power"], correctAnswer: 2 },
      { id: 4, question: "What challenge does the lecturer identify for future cities?", options: ["Declining population", "Balancing growth with sustainability", "Lack of building materials", "Too much green space"], correctAnswer: 1 },
    ],
  });

  await storage.createReadingTest({
    title: "The Impact of Climate Change on Agriculture",
    passage: `Climate change is one of the most pressing issues facing global agriculture today. Rising temperatures, changing rainfall patterns, and increased frequency of extreme weather events are all affecting crop yields and food security worldwide.

Studies have shown that for every degree Celsius increase in global temperature, wheat yields decline by approximately 6%, rice yields by 3.2%, and maize yields by 7.4%. These figures are particularly concerning given that the global population is expected to reach 9.7 billion by 2050, requiring a 70% increase in food production.

In tropical regions, where temperatures are already near the upper limits for many crops, even small increases can have devastating effects. Farmers in sub-Saharan Africa, South Asia, and Central America are among the most vulnerable. Many rely on rain-fed agriculture and lack the resources to adapt to changing conditions.

However, climate change does not affect all regions equally. Some northern regions, particularly in Canada, Russia, and Scandinavia, may actually see increased agricultural productivity as warmer temperatures extend growing seasons and open up previously unsuitable land for cultivation.

Adaptation strategies include developing heat-resistant crop varieties, improving irrigation systems, diversifying crops, and adopting conservation agriculture practices. Governments and international organizations are investing billions in agricultural research to address these challenges, but experts warn that without significant reductions in greenhouse gas emissions, adaptation alone will not be sufficient to prevent widespread food insecurity.`,
    topic: "Environment & Agriculture",
    description: "Read about how climate change affects global agriculture and answer the comprehension questions.",
    difficulty: "Medium",
    duration: 20,
    questions: [
      { id: 1, question: "According to the passage, which crop is most affected by each degree of temperature increase?", options: ["Wheat", "Rice", "Maize", "Barley"], correctAnswer: 2 },
      { id: 2, question: "What is the projected global population by 2050?", options: ["8.5 billion", "9.0 billion", "9.7 billion", "10.2 billion"], correctAnswer: 2 },
      { id: 3, question: "Which regions are most vulnerable to climate change effects on agriculture?", options: ["Northern Europe and Canada", "Sub-Saharan Africa and South Asia", "Australia and New Zealand", "Western Europe and Japan"], correctAnswer: 1 },
      { id: 4, question: "Which regions might benefit from climate change in terms of agriculture?", options: ["Tropical regions", "Desert regions", "Northern regions like Canada and Scandinavia", "Coastal regions"], correctAnswer: 2 },
      { id: 5, question: "What does the passage suggest about adaptation strategies alone?", options: ["They will be fully sufficient", "They need to be combined with emission reductions", "They are too expensive to implement", "They only work in developed countries"], correctAnswer: 1 },
    ],
  });

  await storage.createReadingTest({
    title: "The History of the Internet",
    passage: `The Internet, one of the most transformative inventions in human history, had humble beginnings as a military research project. In the late 1960s, the United States Department of Defense funded ARPANET (Advanced Research Projects Agency Network), a project designed to create a communication network that could survive a nuclear attack.

The first message sent over ARPANET was transmitted on October 29, 1969, from a computer at UCLA to one at Stanford Research Institute. The intended message was "LOGIN," but the system crashed after just two letters, making "LO" the first message ever sent over what would become the Internet.

Throughout the 1970s and 1980s, the network grew as universities and research institutions connected their computers. The development of TCP/IP (Transmission Control Protocol/Internet Protocol) in 1983 standardized communication between different networks, effectively creating the "network of networks" that we know as the Internet.

The World Wide Web, invented by Tim Berners-Lee at CERN in 1989, made the Internet accessible to ordinary users. By creating HTML, URLs, and HTTP, Berners-Lee provided the tools that transformed the Internet from a specialized research tool into a global information platform.

The commercialization of the Internet in the mid-1990s led to explosive growth. Companies like Amazon, Google, and eBay emerged, fundamentally changing commerce, information access, and social interaction. Today, over 5 billion people worldwide use the Internet, and it has become an essential part of daily life, education, business, and governance.`,
    topic: "Technology & History",
    description: "Read about the history of the Internet from its origins to the present day.",
    difficulty: "Easy",
    duration: 15,
    questions: [
      { id: 1, question: "What was ARPANET originally designed for?", options: ["Commercial use", "Educational purposes", "Military communication that could survive nuclear attack", "Social networking"], correctAnswer: 2 },
      { id: 2, question: "What was the first message sent over ARPANET?", options: ["HELLO", "LO (system crashed before completing LOGIN)", "TEST", "CONNECT"], correctAnswer: 1 },
      { id: 3, question: "What protocol standardized Internet communication in 1983?", options: ["HTML", "HTTP", "TCP/IP", "FTP"], correctAnswer: 2 },
      { id: 4, question: "Who invented the World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Vint Cerf"], correctAnswer: 2 },
      { id: 5, question: "How many people use the Internet today according to the passage?", options: ["Over 3 billion", "Over 4 billion", "Over 5 billion", "Over 6 billion"], correctAnswer: 2 },
    ],
  });

  await storage.createWritingTest({
    title: "Bar Chart: Student Enrollment",
    task: 1,
    topic: "Education Statistics",
    description: "Describe the bar chart showing student enrollment in different faculties at a university over two academic years.",
    prompt: "The bar chart below shows the number of students enrolled in five different faculties at Greenfield University in the academic years 2020/21 and 2023/24.\n\nSummarize the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    difficulty: "Medium",
    duration: 20,
    tips: [
      "Start with an overview paragraph describing the general trend.",
      "Group similar data together for comparison.",
      "Use appropriate language for describing changes: increased, decreased, remained stable.",
      "Include specific data points to support your description.",
      "Do not give opinions or reasons - just describe what you see.",
    ],
    sampleAnswer: "The bar chart illustrates student enrollment across five faculties at Greenfield University, comparing the academic years 2020/21 and 2023/24.\n\nOverall, enrollment increased in most faculties, with the most significant growth observed in Computer Science and Business Studies.\n\nIn 2020/21, Engineering had the highest enrollment at approximately 850 students, followed by Business Studies with around 720. Computer Science and Arts had similar numbers, approximately 500 and 480 respectively, while Sciences had the lowest at about 350.\n\nBy 2023/24, Computer Science experienced the most dramatic increase, rising to nearly 900 students. Business Studies also saw substantial growth, reaching approximately 880. Engineering maintained its strong numbers at about 870. Arts showed moderate growth to around 550, while Sciences remained relatively stable at approximately 380.\n\nThe most notable trend is the rapid growth of Computer Science, which overtook several other faculties to become one of the most popular departments.",
  });

  await storage.createWritingTest({
    title: "Essay: Technology in Education",
    task: 2,
    topic: "Education & Technology",
    description: "Write an essay discussing whether technology has had a positive or negative impact on education.",
    prompt: "Some people believe that modern technology has made education more accessible and effective, while others argue that it has created new problems such as distraction and inequality.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
    difficulty: "Hard",
    duration: 40,
    tips: [
      "Plan your essay structure before writing: introduction, body paragraphs, conclusion.",
      "Discuss both sides of the argument before giving your opinion.",
      "Use specific examples to support each viewpoint.",
      "Use linking words to connect ideas: however, furthermore, on the other hand.",
      "End with a clear conclusion that states your position.",
      "Aim for 4-5 paragraphs in total.",
    ],
    sampleAnswer: null,
  });

  console.log("Seed data loaded successfully");
}
