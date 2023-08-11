import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams } from 'react-router-dom';

function App() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [id, setId] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState(false);
  const [confirmation, setConfirmations] = useState(true);
  const [doConfirmOption, setDoConfirmOption] = useState(false);
  const [doConfirmation, setDoConfirmations] = useState(true);
  const [wait, setWait] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [ending, setEnding] = useState('');
  const [role, setRole] = useState('');
  const [questions, setQuestions] = useState([]);

  const chatContainerRef = useRef();

  const fetchDataFromBackend = async (jsonData, url) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    // 获取查询参数部分
    const queryParams = new URLSearchParams(window.location.search);
    // 获取特定键的值
    const idParam = queryParams.get('id');
    console.log(idParam);
    handleAssistantMessage("Do you want to do confirmation?");
    setDoConfirmOption(true);
    setId(idParam);
    const jsonData = {
      "uuid": idParam,
      "flag": 0
    };
    fetchDataFromBackend(jsonData, 'https://supahrbackend.854799920.workers.dev/').then((data) => {
      setEnding(data.message[0].ending);
      setGreeting(data.message[0].greeting);
      handleAssistantMessage(data.message[0].greeting);
      setRole(data.message[0].prompt);
      const jsonQuestions = JSON.parse(data.message[0].questions);
      console.log(jsonQuestions);
      setQuestions(jsonQuestions.questions);
    });

  }, []);


  // 动态生成的选项数据
  const [options, setOptions] = useState([
    'Option 1',
    'Option 2',
    // Add more options as needed
  ]);
  const handleSetOptions = (newOptions) => {
    setOptions(newOptions);
  };


  const handleOptionClick = (option) => {
    const newMessage = {
      id: uuidv4(),
      text: option,
      sender: 'user',
    };
    setMessages((messages) => [...messages, newMessage]);
    setShowOptions(false);
    if (doConfirmation == true) {
      setConfirmOptions(true);
      handleAssistantMessage("Do you confirm your answer?");
    }
    setIsInputDisabled(true);
  };

  const handleConfirmYES = (YES) => {
    const newMessage = {
      id: uuidv4(),
      text: YES,
      sender: 'user',
    };
    setMessages((messages) => [...messages, newMessage]);
    setConfirmations(true);
    setConfirmOptions(false);
    setIsInputDisabled(true);
  };

  const handleConfirmNO = (NO) => {
    const newMessage = {
      id: uuidv4(),
      text: NO,
      sender: 'user',
    };
    setMessages([...messages, newMessage]);
    setConfirmations(false);
    setConfirmOptions(false);
    setIsInputDisabled(true);
  };

  const handleDoConfirmYes = (YES) => {

    setDoConfirmations(true);
    setDoConfirmOption(false);
  }

  const handleDoConfirmNo = (NO) => {

    setDoConfirmations(false);
    setDoConfirmOption(false);
  }

  const handleSendMessage = async () => {
    if (userInput.trim() === '') return;
    const newMessage = {
      id: uuidv4(),
      text: userInput.trim(),
      sender: 'user',
    };
    setWait(true);
    setMessages((messages) => [...messages, newMessage]);
    setUserInput('');
    const updatedQueue = [...questions];
    const question = updatedQueue.shift(); // 从队头移除项
    console.log(question.question);
    const jsonData = {
      "question": "",
      "message": {
        "assistant": question.question,
        "user": userInput.trim()
      },
      "flag": 0,
      "role": role
    };
    setIsInputDisabled(true);
    await fetchDataFromBackend(jsonData, 'https://chathr.854799920.workers.dev/').then((data) => {
      
        let jsonResponse = JSON.parse(data.message);
        setWait(false);
        if (jsonResponse.isRelevant) {
          if (doConfirmation == true) {
            handleAssistantMessage("Do you confirm your answer?");
            setConfirmOptions(true);
          } else {
            if (updatedQueue.length > 1) {
              const updatedQueue = [...questions];
              updatedQueue.shift(); // 从队头移除项
              setQuestions(updatedQueue);
            } else {
              handleAssistantMessage(ending);
              const jsonRecordData = {
                "interview_id": id,
                "record": JSON.stringify([...messages]),
                "flag": 1
              };
              fetchDataFromBackend(jsonRecordData, 'https://supahrbackend.854799920.workers.dev/');
            }
          }
        } else {
          handleAssistantMessage(jsonResponse.response);
          setIsInputDisabled(false);
        }
      
    });
  };

  const handleAssistantMessage = (text) => {
    const newMessage = {
      id: uuidv4(),
      text: text,
      sender: 'assistant',
    };
    setMessages((messages) => [...messages, newMessage]);
  }

  useEffect(() => {
    // Simulate assistant's reply after a short delay
    if (messages[messages.length - 1]?.sender === 'user') {
      setTimeout(() => {
        if (wait == true) {
          return;
        }
        const updatedQueue = [...questions];
        if (updatedQueue.length > 1 && confirmation == true) {
          updatedQueue.shift(); // 从队头移除项
          setQuestions(updatedQueue);
        } else if (updatedQueue.length > 1 && confirmation == false) {
          setQuestions(updatedQueue);
        } else {
          handleAssistantMessage(ending);
          const jsonData = {
            "interview_id": id,
            "record": JSON.stringify([...messages]),
            "flag": 1
          };
          fetchDataFromBackend(jsonData, 'https://supahrbackend.854799920.workers.dev/');
        }
        setIsInputDisabled(false);
      }, 1000);
    }
  }, [messages]);

  useEffect(() => {
    if (questions.length > 0) {
      const updatedQueue = [...questions];
      const question = updatedQueue.shift(); // 从队头移除项
      const jsonData = {
        "question": question.question,
        "message": "",
        "flag": 0,
        "role": role
      };
      fetchDataFromBackend(jsonData, 'https://chathr.854799920.workers.dev/').then((data) => {
        handleAssistantMessage(data.message);
        handleSetOptions(question.options);
        if (question.options.length > 0) {
          setShowOptions(true);
          setIsInputDisabled(true);
        }
      });

    }
  }, [questions]);

  useEffect(() => {
    // 消息更新后滚动到底部
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* 聊天消息区域 */}
      <div
        className="bg-white p-4 shadow-md rounded-md flex-1 overflow-y-auto space-y-4"
        ref={chatContainerRef}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${message.sender === 'user' ? 'text-right' : 'text-left'
              }`}
          >
            <div
              className={`${message.sender === 'user'
                ? 'bg-blue-500 text-white rounded-tl-md rounded-br-md rounded-tr-md'
                : 'bg-green-500 text-white rounded-tl-md rounded-bl-md rounded-tr-md'
                } py-2 px-4 break-all max-w-md inline-block`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* 选项按钮区域 */}
      {showOptions && (
        <div className="bg-white p-4 shadow-md rounded-md mt-4">
          <div className="flex justify-center space-x-4">
            {options.map((option) => (
              <button
                key={option}
                className="bg-blue-500 text-white rounded-lg px-4 py-2"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 验证按钮区域 */}
      {confirmOptions && (
        <div className="bg-white p-4 shadow-md rounded-md mt-4">
          <div className="flex justify-center space-x-4">
            <button
              key='YES'
              className="bg-green-500 text-white rounded-lg px-4 py-2"
              onClick={() => handleConfirmYES('YES')}
            >
              YES
            </button>
            <button
              key='NO'
              className="bg-red-500 text-white rounded-lg px-4 py-2"
              onClick={() => handleConfirmNO('NO')}
            >
              NO
            </button>
          </div>
        </div>
      )}

      {/* 是否验证按钮区域 */}
      {doConfirmOption && (
        <div className="bg-white p-4 shadow-md rounded-md mt-4">
          <div className="flex justify-center space-x-4">
            <button
              key='YES'
              className="bg-green-500 text-white rounded-lg px-4 py-2"
              onClick={() => handleDoConfirmYes('YES')}
            >
              YES
            </button>
            <button
              key='NO'
              className="bg-red-500 text-white rounded-lg px-4 py-2"
              onClick={() => handleDoConfirmNo('NO')}
            >
              NO
            </button>
          </div>
        </div>
      )}

      {/* 用户输入区域 */}
      <div className="bg-white mt-4 p-4 shadow-md rounded-md">
        <div className="flex">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1 rounded-l-lg border border-gray-300 p-2 focus:outline-none"
            placeholder={`${isInputDisabled ? 'Please waiting for the response' : 'Type your text'
              }`}
            disabled={isInputDisabled}
          />
          {!showOptions && !confirmOptions && (
            <button
              className={`rounded-r-lg px-4 py-2 ml-2 ${isInputDisabled ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white'
                }`}
              onClick={handleSendMessage}
              disabled={isInputDisabled}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
