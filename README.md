# Framing the Problem

Accessing accurate and unbiased political and civic information is difficult for most people. Existing news sources often summarize complex issues with bias, and government websites are hard to navigate. Moreover, this information is rarely personalized to an individual’s interests, location, or understanding. As a result, many citizens remain disconnected from policies that directly impact their lives.

# Idea Explanation

Our idea is a political education and information app that provides the user with information about federal bills and current events that are happening in the United States.  The app creates personalized content by generating them recent bills that have been introduced to congress and bills that are related to their interests. The user can click on the bill to learn more basic information about the bill and an AI generated summary of the bill that can easily and quickly be understood by the reader. The user can also ask a chatbot more questions about the bill to gain more clarity on the aspects that they might be more interested or concerned about. 

# Implementation





Frontend: Built with React Native and Expo for cross-platform support (iOS and Android).



Backend: Uses Firebase for user authentication, data storage, and real-time updates.



Data & AI Integration:





Congress API — retrieves up-to-date federal bill data and metadata.



Google Gemini API — generates natural-language summaries and powers the in-app chatbot.



Firebase Firestore — stores user profiles, saved bills, and interaction history.

The frontend communicates with Firebase and external APIs to fetch relevant data, display personalized bill feeds, and allow users to save or favorite items.

# Challenges

One thing that we struggled with was the rate limiting on the query requests to the congress API. Because of this, only certain information could be pulled from the API. We overcame this by including the API queries that we thought would generate the most beneficial information with the limited queries that we had. Another issue that we came across was web scraping. The website

# Accomplishments

We learned that there are many different alternatives to doing the functions that you want to have. We also learned new functions of the languages that we were using for the frontend and backend and how to maximize the information that we could get from APIs. 

Next Steps





Expand personalization: Include state and local government data for more relevant civic insights.



Broaden coverage: Add non-legislative current events—such as finance, science, and healthcare—summarized in an unbiased, accessible way.



Community features: Allow users to discuss bills, vote on issues, or follow representatives.



Enhanced transparency: Provide source links and bias indicators for every summary.

Ultimately, we aim to make Politik a trusted one-stop platform for understanding how government actions and current events affect individuals and communities
