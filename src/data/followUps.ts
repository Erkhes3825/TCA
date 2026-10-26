// 聞き足し：最初の自由口述（interview.ts の6問）で拾いきれなかった必須項目を、チャットで短く聞き足す。
// 実装時は AI が自由口述から拾えなかった項目だけを選ぶ。モックではサンプル症例で拾えなかった項目を並べてある
// （悪寒・常用薬・薬のアレルギーの有無は口述で拾えたので聞かない。医療者画面にもそう書いている）。
// 質問文の元は ms-26/内科_聞き足し質問文.csv。日本語・英語・中国語・モンゴル語は CSV と同じ文。
// 注意: 英語以外の訳はモック用（Claude による訳）。本番前にネイティブチェックが必要。
import type { LangId } from './languages';
import type { TermMap } from './interview';

export type FollowUpId =
  | 'onsetConfirm' | 'onsetMode' | 'course' | 'selfCare' | 'fatigue'
  | 'bloodThinner' | 'allergyDetail' | 'foodLatex' | 'illness' | 'surgery'
  | 'pregnancy' | 'breastfeeding' | 'smoking' | 'alcohol' | 'travel'
  | 'heightWeight' | 'insurance' | 'firstVisit' | 'interpreter';

export type OptId =
  | 'yes' | 'no' | 'unknown' | 'noAnswer' | 'correct' | 'fix'
  | 'sudden' | 'gradual' | 'better' | 'same' | 'worse' | 'waves'
  | 'nothingDone' | 'dontRemember' | 'noDrink'
  | 'smoker' | 'exSmoker' | 'nonSmoker'
  | 'jpInsurance' | 'travelInsurance' | 'noInsurance'
  | 'need' | 'noNeed' | 'none';

export type IllnessId = 'hypertension' | 'diabetes' | 'asthma' | 'heart' | 'kidney' | 'liver' | 'cancer' | 'tb' | 'other';
export const ILLNESS_IDS: IllnessId[] = ['hypertension', 'diabetes', 'asthma', 'heart', 'kidney', 'liver', 'cancer', 'tb', 'other'];

/** 声で答える聞き足し（サンプル回答があるもの） */
export type VoiceId = 'selfCare' | 'fatigue' | 'allergyDetail' | 'alcohol';

/** 回答：ボタンの選択肢 / 声で回答 / 病気の複数選択 / 身長・体重 */
export type FollowUpAnswer = OptId | 'voice' | (IllnessId | 'none')[] | { h: string; w: string };
export type FollowUpAnswers = Partial<Record<FollowUpId, FollowUpAnswer>>;

export interface FollowUpDef {
  id: FollowUpId;
  /** choice: 1つ選ぶ / voice: 話す（よくある答えはボタンでも） / multi: 病気を複数選ぶ / measure: 身長・体重 */
  kind: 'choice' | 'voice' | 'multi' | 'measure';
  options: OptId[];
  /** 基本情報の年齢・性別で聞くかどうか決まるもの */
  when?: (b: { age: number; sex: number }) => boolean;
}

/** 出生時の性別が女性（UI.sexes の0番）で、15〜49歳（UI.ages の1・2番） */
const childbearing = (b: { age: number; sex: number }) => b.sex === 0 && (b.age === 1 || b.age === 2);

/** 聞き足しの並び（CSV と同じ順） */
export const FOLLOW_UPS: FollowUpDef[] = [
  { id: 'onsetConfirm', kind: 'choice', options: ['correct', 'fix'] },
  { id: 'onsetMode', kind: 'choice', options: ['sudden', 'gradual', 'unknown'] },
  { id: 'course', kind: 'choice', options: ['better', 'same', 'worse', 'waves'] },
  { id: 'selfCare', kind: 'voice', options: ['nothingDone'] },
  { id: 'fatigue', kind: 'voice', options: [] },
  { id: 'bloodThinner', kind: 'choice', options: ['yes', 'no', 'unknown'] },
  { id: 'allergyDetail', kind: 'voice', options: ['dontRemember'] },
  { id: 'foodLatex', kind: 'choice', options: ['yes', 'no', 'unknown'] },
  { id: 'illness', kind: 'multi', options: [] },
  { id: 'surgery', kind: 'choice', options: ['yes', 'no'] },
  { id: 'pregnancy', kind: 'choice', options: ['yes', 'no', 'unknown', 'noAnswer'], when: childbearing },
  { id: 'breastfeeding', kind: 'choice', options: ['yes', 'no'], when: childbearing },
  { id: 'smoking', kind: 'choice', options: ['smoker', 'exSmoker', 'nonSmoker'] },
  { id: 'alcohol', kind: 'voice', options: ['noDrink'] },
  { id: 'travel', kind: 'choice', options: ['yes', 'no'] },
  { id: 'heightWeight', kind: 'measure', options: ['unknown'] },
  { id: 'insurance', kind: 'choice', options: ['jpInsurance', 'travelInsurance', 'noInsurance', 'unknown'] },
  { id: 'firstVisit', kind: 'choice', options: ['yes', 'no'] },
  { id: 'interpreter', kind: 'choice', options: ['need', 'noNeed', 'unknown'] },
];

export function activeFollowUps(b: { age: number; sex: number }): FollowUpDef[] {
  return FOLLOW_UPS.filter((f) => !f.when || f.when(b));
}

export interface FollowUpText {
  /** 聞き足しを始めるときの前置き */
  intro: string;
  q: Record<FollowUpId, string>;
  /** 妊娠の質問の前に添える一文 */
  pregnancyLead: string;
  /** onsetConfirm で「合っている」を選んだときに確認画面に出す値（サンプル症例の聞き取り内容） */
  onsetHeard: string;
  opt: Record<OptId, string>;
  illness: Record<IllnessId, string>;
  height: string;
  weight: string;
  next: string;
  /** 確認画面の項目名 */
  keys: Record<FollowUpId, string>;
  /** 確認画面：まとめの説明と送信の同意 */
  summary: string;
  consent: string;
}

const en: FollowUpText = {
  intro: 'Thank you. Just a few more short questions.',
  q: {
    onsetConfirm: 'We heard: “since last night”. Is that right?',
    onsetMode: 'Did it come on suddenly, or build up gradually?',
    course: 'Compared with when it started, how is it now?',
    selfCare: 'Have you taken any medicine or tried anything for it before coming in?',
    fatigue: 'How is your energy and appetite?',
    bloodThinner: 'Do you take any blood thinners (medicine that stops your blood from clotting)?',
    allergyDetail: 'Which medicine was it, and what happened? It’s fine if you don’t know the name.',
    foodLatex: 'Are you allergic to any foods, or to latex (rubber gloves)?',
    illness: 'Are you being treated for any illness now, or have you had any serious illness in the past?',
    surgery: 'Have you ever had surgery or stayed in hospital?',
    pregnancy: 'Is there any chance you could be pregnant?',
    breastfeeding: 'Are you breastfeeding?',
    smoking: 'Do you smoke?',
    alcohol: 'Do you drink alcohol? If so, about how many days a week, and how many drinks each time?',
    travel: 'In the past month, have you been in any country or region other than Japan?',
    heightWeight: 'Roughly how tall are you, and how much do you weigh?',
    insurance: 'Do you have health insurance?',
    firstVisit: 'Is this your first visit to this hospital?',
    interpreter: 'Would you like an interpreter during the consultation?',
  },
  pregnancyLead: 'We ask this to choose medicine and tests safely.',
  onsetHeard: 'Since last night',
  opt: {
    yes: 'Yes', no: 'No', unknown: 'I don’t know', noAnswer: 'Prefer not to say',
    correct: 'Yes, that’s right', fix: 'No, let me correct it',
    sudden: 'Suddenly', gradual: 'Gradually',
    better: 'Getting better', same: 'About the same', worse: 'Getting worse', waves: 'It comes and goes',
    nothingDone: 'I haven’t done anything', dontRemember: 'I don’t remember', noDrink: 'I don’t drink',
    smoker: 'Yes, I smoke', exSmoker: 'I used to', nonSmoker: 'No, never',
    jpInsurance: 'Japanese health insurance', travelInsurance: 'Travel insurance', noInsurance: 'No insurance',
    need: 'Yes, please', noNeed: 'No, I’m fine', none: 'None',
  },
  illness: {
    hypertension: 'High blood pressure', diabetes: 'Diabetes', asthma: 'Asthma', heart: 'Heart disease',
    kidney: 'Kidney disease', liver: 'Liver disease', cancer: 'Cancer', tb: 'Tuberculosis', other: 'Other',
  },
  height: 'Height (cm)',
  weight: 'Weight (kg)',
  next: 'Next',
  keys: {
    onsetConfirm: 'When it started', onsetMode: 'How it started', course: 'Since it started',
    selfCare: 'What you tried', fatigue: 'Energy and appetite', bloodThinner: 'Blood thinners',
    allergyDetail: 'Medicine reaction', foodLatex: 'Food or latex allergy', illness: 'Illnesses',
    surgery: 'Surgery or hospital stays', pregnancy: 'Chance of pregnancy', breastfeeding: 'Breastfeeding',
    smoking: 'Smoking', alcohol: 'Alcohol', travel: 'Travel in the past month', heightWeight: 'Height and weight',
    insurance: 'Health insurance', firstVisit: 'First visit here', interpreter: 'Interpreter',
  },
  summary: 'Here is a summary of what you told us. Please check that everything is correct.',
  consent: 'May we send this to the hospital’s medical staff?',
};

const zh: FollowUpText = {
  intro: '谢谢您。接下来还有几个简短的问题。',
  q: {
    onsetConfirm: '我们听到的是：“从昨天晚上开始”。对吗？',
    onsetMode: '是突然开始的，还是慢慢加重的？',
    course: '和刚开始的时候相比，现在怎么样？',
    selfCare: '来医院之前，您吃过药或者做过什么处理吗？',
    fatigue: '您身体乏力吗？食欲怎么样？',
    bloodThinner: '您在吃抗凝血的药（让血液不容易凝固的药）吗？',
    allergyDetail: '请告诉我们是什么药，出现了什么情况。不知道药名也没关系。',
    foodLatex: '您对什么食物或者橡胶手套等过敏吗？',
    illness: '您现在有正在治疗的疾病，或者以前得过什么大病吗？',
    surgery: '您做过手术或者住过院吗？',
    pregnancy: '您现在有怀孕的可能吗？',
    breastfeeding: '您现在在哺乳期吗？',
    smoking: '您抽烟吗？',
    alcohol: '您喝酒吗？如果喝，一周大概喝几天，每次喝几杯？',
    travel: '最近一个月内，您在日本以外的国家或地区待过吗？',
    heightWeight: '请告诉我们您大概的身高和体重。',
    insurance: '您有医疗保险吗？',
    firstVisit: '您是第一次来这家医院吗？',
    interpreter: '看诊时您需要翻译吗？',
  },
  pregnancyLead: '为了安全地选择药物和检查，请让我们确认一下。',
  onsetHeard: '从昨天晚上开始',
  opt: {
    yes: '是', no: '否', unknown: '不知道', noAnswer: '不想回答',
    correct: '对', fix: '不对，我要修改',
    sudden: '突然', gradual: '慢慢',
    better: '在好转', same: '差不多', worse: '在加重', waves: '时好时坏',
    nothingDone: '什么都没做', dontRemember: '记不清了', noDrink: '不喝酒',
    smoker: '抽', exSmoker: '以前抽过', nonSmoker: '不抽',
    jpInsurance: '日本的医疗保险', travelInsurance: '旅行保险', noInsurance: '没有保险',
    need: '需要', noNeed: '不需要', none: '没有',
  },
  illness: {
    hypertension: '高血压', diabetes: '糖尿病', asthma: '哮喘', heart: '心脏病',
    kidney: '肾病', liver: '肝病', cancer: '癌症', tb: '结核', other: '其他',
  },
  height: '身高（cm）',
  weight: '体重（kg）',
  next: '下一步',
  keys: {
    onsetConfirm: '开始时间', onsetMode: '开始方式', course: '之后的变化',
    selfCare: '已采取的措施', fatigue: '体力和食欲', bloodThinner: '抗凝血药',
    allergyDetail: '药物反应', foodLatex: '食物或乳胶过敏', illness: '疾病史',
    surgery: '手术或住院', pregnancy: '怀孕的可能', breastfeeding: '哺乳',
    smoking: '吸烟', alcohol: '饮酒', travel: '最近一个月的出行', heightWeight: '身高和体重',
    insurance: '医疗保险', firstVisit: '是否初诊', interpreter: '翻译',
  },
  summary: '最后，我们整理了您告诉我们的内容。请确认是否有误。',
  consent: '可以把这些内容发送给医院的医务人员吗？',
};

const vi: FollowUpText = {
  intro: 'Cảm ơn bạn. Chỉ còn vài câu hỏi ngắn nữa.',
  q: {
    onsetConfirm: 'Chúng tôi nghe là: “từ tối qua”. Có đúng không?',
    onsetMode: 'Triệu chứng bắt đầu đột ngột, hay nặng dần lên?',
    course: 'So với lúc mới bắt đầu, bây giờ thế nào?',
    selfCare: 'Trước khi đến đây, bạn đã uống thuốc hoặc làm gì để đỡ chưa?',
    fatigue: 'Bạn thấy người có mệt không, ăn uống thế nào?',
    bloodThinner: 'Bạn có đang uống thuốc chống đông máu (thuốc làm máu khó đông) không?',
    allergyDetail: 'Đó là thuốc gì, và đã bị như thế nào? Không nhớ tên thuốc cũng không sao.',
    foodLatex: 'Bạn có bị dị ứng với thức ăn nào, hoặc với cao su (găng tay cao su) không?',
    illness: 'Bạn có đang điều trị bệnh gì, hoặc từng mắc bệnh nặng nào không?',
    surgery: 'Bạn đã từng phẫu thuật hoặc nằm viện chưa?',
    pregnancy: 'Hiện tại bạn có khả năng đang mang thai không?',
    breastfeeding: 'Bạn có đang cho con bú không?',
    smoking: 'Bạn có hút thuốc lá không?',
    alcohol: 'Bạn có uống rượu bia không? Nếu có, khoảng mấy ngày một tuần, mỗi lần bao nhiêu ly?',
    travel: 'Trong một tháng qua, bạn có ở quốc gia hay vùng lãnh thổ nào ngoài Nhật Bản không?',
    heightWeight: 'Cho chúng tôi biết chiều cao và cân nặng khoảng bao nhiêu.',
    insurance: 'Bạn có bảo hiểm y tế không?',
    firstVisit: 'Đây có phải lần đầu bạn đến bệnh viện này không?',
    interpreter: 'Khi khám, bạn có cần phiên dịch không?',
  },
  pregnancyLead: 'Chúng tôi hỏi để chọn thuốc và xét nghiệm an toàn.',
  onsetHeard: 'Từ tối qua',
  opt: {
    yes: 'Có', no: 'Không', unknown: 'Không biết', noAnswer: 'Không muốn trả lời',
    correct: 'Đúng rồi', fix: 'Không, tôi muốn sửa',
    sudden: 'Đột ngột', gradual: 'Dần dần',
    better: 'Đang đỡ hơn', same: 'Không thay đổi', worse: 'Đang nặng hơn', waves: 'Lúc tăng lúc giảm',
    nothingDone: 'Chưa làm gì', dontRemember: 'Không nhớ', noDrink: 'Không uống',
    smoker: 'Có hút', exSmoker: 'Trước đây có hút', nonSmoker: 'Không hút',
    jpInsurance: 'Bảo hiểm y tế Nhật Bản', travelInsurance: 'Bảo hiểm du lịch', noInsurance: 'Không có bảo hiểm',
    need: 'Cần', noNeed: 'Không cần', none: 'Không có',
  },
  illness: {
    hypertension: 'Cao huyết áp', diabetes: 'Tiểu đường', asthma: 'Hen suyễn', heart: 'Bệnh tim',
    kidney: 'Bệnh thận', liver: 'Bệnh gan', cancer: 'Ung thư', tb: 'Lao', other: 'Khác',
  },
  height: 'Chiều cao (cm)',
  weight: 'Cân nặng (kg)',
  next: 'Tiếp',
  keys: {
    onsetConfirm: 'Thời điểm bắt đầu', onsetMode: 'Cách bắt đầu', course: 'Diễn biến',
    selfCare: 'Đã tự xử lý', fatigue: 'Thể lực và ăn uống', bloodThinner: 'Thuốc chống đông',
    allergyDetail: 'Phản ứng với thuốc', foodLatex: 'Dị ứng thức ăn, cao su', illness: 'Bệnh đã/đang mắc',
    surgery: 'Phẫu thuật, nằm viện', pregnancy: 'Khả năng mang thai', breastfeeding: 'Cho con bú',
    smoking: 'Hút thuốc', alcohol: 'Rượu bia', travel: 'Đi nước ngoài 1 tháng qua', heightWeight: 'Chiều cao, cân nặng',
    insurance: 'Bảo hiểm y tế', firstVisit: 'Lần đầu đến khám', interpreter: 'Phiên dịch',
  },
  summary: 'Cuối cùng, chúng tôi đã tóm tắt những gì bạn nói. Vui lòng kiểm tra xem có sai sót gì không.',
  consent: 'Chúng tôi có thể gửi nội dung này cho nhân viên y tế của bệnh viện không?',
};

const ko: FollowUpText = {
  intro: '감사합니다. 짧은 질문 몇 가지만 더 드릴게요.',
  q: {
    onsetConfirm: '“어젯밤부터”라고 들었습니다. 맞습니까?',
    onsetMode: '갑자기 시작됐나요, 아니면 점점 심해졌나요?',
    course: '처음 시작됐을 때와 비교해서 지금은 어떤가요?',
    selfCare: '병원에 오기 전에 약을 먹거나 따로 해 본 것이 있나요?',
    fatigue: '몸이 나른한 느낌이나 식욕은 어떤가요?',
    bloodThinner: '피를 묽게 하는 약(피가 잘 굳지 않게 하는 약)을 드시고 있나요?',
    allergyDetail: '어떤 약이었고 어떻게 되었는지 알려 주세요. 약 이름을 몰라도 괜찮습니다.',
    foodLatex: '음식이나 고무장갑(라텍스) 등에 알레르기가 있나요?',
    illness: '지금 치료 중인 병이나, 지금까지 앓았던 큰 병이 있나요?',
    surgery: '수술을 받거나 입원한 적이 있나요?',
    pregnancy: '지금 임신 가능성이 있나요?',
    breastfeeding: '지금 모유 수유 중인가요?',
    smoking: '담배를 피우시나요?',
    alcohol: '술을 드시나요? 드신다면 일주일에 며칠 정도, 한 번에 몇 잔 정도인가요?',
    travel: '최근 한 달 동안 일본 이외의 나라나 지역에 있었나요?',
    heightWeight: '대략적인 키와 몸무게를 알려 주세요.',
    insurance: '건강보험이 있나요?',
    firstVisit: '이 병원은 처음 오셨나요?',
    interpreter: '진료할 때 통역이 필요하신가요?',
  },
  pregnancyLead: '약과 검사를 안전하게 고르기 위해 확인하겠습니다.',
  onsetHeard: '어젯밤부터',
  opt: {
    yes: '예', no: '아니요', unknown: '모르겠어요', noAnswer: '답하고 싶지 않아요',
    correct: '네, 맞아요', fix: '아니요, 고칠게요',
    sudden: '갑자기', gradual: '점점',
    better: '좋아지고 있어요', same: '비슷해요', worse: '나빠지고 있어요', waves: '좋았다 나빴다 해요',
    nothingDone: '아무것도 안 했어요', dontRemember: '기억나지 않아요', noDrink: '술은 안 마셔요',
    smoker: '피워요', exSmoker: '예전에 피웠어요', nonSmoker: '안 피워요',
    jpInsurance: '일본 건강보험', travelInsurance: '여행자 보험', noInsurance: '보험 없음',
    need: '필요해요', noNeed: '괜찮아요', none: '없음',
  },
  illness: {
    hypertension: '고혈압', diabetes: '당뇨병', asthma: '천식', heart: '심장병',
    kidney: '신장병', liver: '간 질환', cancer: '암', tb: '결핵', other: '기타',
  },
  height: '키(cm)',
  weight: '몸무게(kg)',
  next: '다음',
  keys: {
    onsetConfirm: '시작 시기', onsetMode: '시작 양상', course: '경과',
    selfCare: '스스로 한 조치', fatigue: '기운과 식욕', bloodThinner: '혈액 응고 억제제',
    allergyDetail: '약 부작용', foodLatex: '음식·라텍스 알레르기', illness: '병력',
    surgery: '수술·입원', pregnancy: '임신 가능성', breastfeeding: '수유',
    smoking: '흡연', alcohol: '음주', travel: '최근 한 달 해외 체류', heightWeight: '키와 몸무게',
    insurance: '건강보험', firstVisit: '첫 방문 여부', interpreter: '통역',
  },
  summary: '마지막으로 말씀하신 내용을 정리했습니다. 틀린 곳이 없는지 확인해 주세요.',
  consent: '이 내용을 병원 의료진에게 보내도 될까요?',
};

const pt: FollowUpText = {
  intro: 'Obrigado. Só mais algumas perguntas rápidas.',
  q: {
    onsetConfirm: 'Entendemos: “desde ontem à noite”. Está certo?',
    onsetMode: 'Começou de repente ou foi piorando aos poucos?',
    course: 'Comparado a quando começou, como está agora?',
    selfCare: 'Antes de vir, você tomou algum remédio ou fez alguma coisa para melhorar?',
    fatigue: 'Como está sua disposição e seu apetite?',
    bloodThinner: 'Você toma algum anticoagulante (remédio para “afinar o sangue”)?',
    allergyDetail: 'Qual foi o remédio e o que aconteceu? Tudo bem se não souber o nome.',
    foodLatex: 'Você tem alergia a algum alimento ou a látex (luvas de borracha)?',
    illness: 'Você está tratando alguma doença agora ou já teve alguma doença grave?',
    surgery: 'Você já fez alguma cirurgia ou ficou internado(a)?',
    pregnancy: 'Existe alguma chance de você estar grávida?',
    breastfeeding: 'Você está amamentando?',
    smoking: 'Você fuma?',
    alcohol: 'Você bebe álcool? Se sim, mais ou menos quantos dias por semana e quantas doses de cada vez?',
    travel: 'No último mês, você esteve em algum país ou região fora do Japão?',
    heightWeight: 'Diga sua altura e seu peso aproximados.',
    insurance: 'Você tem seguro de saúde?',
    firstVisit: 'É a primeira vez que você vem a este hospital?',
    interpreter: 'Você quer um intérprete durante a consulta?',
  },
  pregnancyLead: 'Perguntamos isso para escolher remédios e exames com segurança.',
  onsetHeard: 'Desde ontem à noite',
  opt: {
    yes: 'Sim', no: 'Não', unknown: 'Não sei', noAnswer: 'Prefiro não responder',
    correct: 'Sim, está certo', fix: 'Não, quero corrigir',
    sudden: 'De repente', gradual: 'Aos poucos',
    better: 'Melhorando', same: 'Igual', worse: 'Piorando', waves: 'Vai e volta',
    nothingDone: 'Não fiz nada', dontRemember: 'Não lembro', noDrink: 'Não bebo',
    smoker: 'Fumo', exSmoker: 'Já fumei', nonSmoker: 'Nunca fumei',
    jpInsurance: 'Seguro de saúde japonês', travelInsurance: 'Seguro-viagem', noInsurance: 'Não tenho seguro',
    need: 'Sim, por favor', noNeed: 'Não preciso', none: 'Nenhuma',
  },
  illness: {
    hypertension: 'Pressão alta', diabetes: 'Diabetes', asthma: 'Asma', heart: 'Doença do coração',
    kidney: 'Doença dos rins', liver: 'Doença do fígado', cancer: 'Câncer', tb: 'Tuberculose', other: 'Outra',
  },
  height: 'Altura (cm)',
  weight: 'Peso (kg)',
  next: 'Próximo',
  keys: {
    onsetConfirm: 'Quando começou', onsetMode: 'Como começou', course: 'Evolução',
    selfCare: 'O que já tentou', fatigue: 'Disposição e apetite', bloodThinner: 'Anticoagulante',
    allergyDetail: 'Reação a remédio', foodLatex: 'Alergia a alimento ou látex', illness: 'Doenças',
    surgery: 'Cirurgia ou internação', pregnancy: 'Chance de gravidez', breastfeeding: 'Amamentação',
    smoking: 'Tabagismo', alcohol: 'Álcool', travel: 'Viagem no último mês', heightWeight: 'Altura e peso',
    insurance: 'Seguro de saúde', firstVisit: 'Primeira consulta aqui', interpreter: 'Intérprete',
  },
  summary: 'Por fim, resumimos o que você nos contou. Confira se está tudo certo.',
  consent: 'Podemos enviar isso para a equipe médica do hospital?',
};

const es: FollowUpText = {
  intro: 'Gracias. Solo unas preguntas cortas más.',
  q: {
    onsetConfirm: 'Entendimos: “desde anoche”. ¿Es correcto?',
    onsetMode: '¿Empezó de repente o fue empeorando poco a poco?',
    course: 'Comparado con cuando empezó, ¿cómo está ahora?',
    selfCare: 'Antes de venir, ¿tomó alguna medicina o hizo algo para aliviarlo?',
    fatigue: '¿Cómo están su energía y su apetito?',
    bloodThinner: '¿Toma algún anticoagulante (medicina para que la sangre no se coagule)?',
    allergyDetail: '¿Qué medicina fue y qué le pasó? No importa si no sabe el nombre.',
    foodLatex: '¿Tiene alergia a algún alimento o al látex (guantes de goma)?',
    illness: '¿Está en tratamiento por alguna enfermedad, o ha tenido alguna enfermedad grave?',
    surgery: '¿Le han operado alguna vez o ha estado hospitalizado(a)?',
    pregnancy: '¿Existe alguna posibilidad de que esté embarazada?',
    breastfeeding: '¿Está dando el pecho?',
    smoking: '¿Fuma?',
    alcohol: '¿Toma alcohol? Si es así, ¿cuántos días a la semana y cuántas copas cada vez, más o menos?',
    travel: 'En el último mes, ¿ha estado en algún país o región fuera de Japón?',
    heightWeight: 'Díganos su estatura y su peso aproximados.',
    insurance: '¿Tiene seguro médico?',
    firstVisit: '¿Es la primera vez que viene a este hospital?',
    interpreter: '¿Quiere un intérprete durante la consulta?',
  },
  pregnancyLead: 'Lo preguntamos para elegir medicinas y pruebas de forma segura.',
  onsetHeard: 'Desde anoche',
  opt: {
    yes: 'Sí', no: 'No', unknown: 'No sé', noAnswer: 'Prefiero no decirlo',
    correct: 'Sí, es correcto', fix: 'No, quiero corregirlo',
    sudden: 'De repente', gradual: 'Poco a poco',
    better: 'Mejorando', same: 'Igual', worse: 'Empeorando', waves: 'Va y viene',
    nothingDone: 'No he hecho nada', dontRemember: 'No me acuerdo', noDrink: 'No tomo alcohol',
    smoker: 'Sí, fumo', exSmoker: 'Fumaba antes', nonSmoker: 'Nunca he fumado',
    jpInsurance: 'Seguro médico japonés', travelInsurance: 'Seguro de viaje', noInsurance: 'Sin seguro',
    need: 'Sí, por favor', noNeed: 'No hace falta', none: 'Ninguna',
  },
  illness: {
    hypertension: 'Presión alta', diabetes: 'Diabetes', asthma: 'Asma', heart: 'Enfermedad del corazón',
    kidney: 'Enfermedad de los riñones', liver: 'Enfermedad del hígado', cancer: 'Cáncer', tb: 'Tuberculosis', other: 'Otra',
  },
  height: 'Estatura (cm)',
  weight: 'Peso (kg)',
  next: 'Siguiente',
  keys: {
    onsetConfirm: 'Cuándo empezó', onsetMode: 'Cómo empezó', course: 'Evolución',
    selfCare: 'Lo que ha probado', fatigue: 'Energía y apetito', bloodThinner: 'Anticoagulantes',
    allergyDetail: 'Reacción a medicinas', foodLatex: 'Alergia a alimentos o látex', illness: 'Enfermedades',
    surgery: 'Operaciones u hospitalizaciones', pregnancy: 'Posibilidad de embarazo', breastfeeding: 'Lactancia',
    smoking: 'Tabaco', alcohol: 'Alcohol', travel: 'Viajes en el último mes', heightWeight: 'Estatura y peso',
    insurance: 'Seguro médico', firstVisit: 'Primera visita aquí', interpreter: 'Intérprete',
  },
  summary: 'Por último, resumimos lo que nos contó. Revise que todo esté correcto.',
  consent: '¿Podemos enviar esto al personal médico del hospital?',
};

const tl: FollowUpText = {
  intro: 'Salamat po. Ilang maikling tanong na lang po.',
  q: {
    onsetConfirm: 'Ang narinig namin: “mula kagabi”. Tama po ba?',
    onsetMode: 'Biglaan po ba itong nagsimula, o unti-unting lumala?',
    course: 'Kumpara noong nagsimula, kumusta na po ngayon?',
    selfCare: 'Bago pumunta rito, uminom po ba kayo ng gamot o may ginawa para gumaan ang pakiramdam?',
    fatigue: 'Kumusta po ang inyong lakas at gana sa pagkain?',
    bloodThinner: 'Umiinom po ba kayo ng pampalabnaw ng dugo (gamot para hindi madaling mamuo ang dugo)?',
    allergyDetail: 'Anong gamot po iyon, at ano ang nangyari? Okay lang kung hindi ninyo alam ang pangalan.',
    foodLatex: 'May allergy po ba kayo sa anumang pagkain, o sa latex (gomang guwantes)?',
    illness: 'May sakit po ba kayong ginagamot ngayon, o nagkaroon na ba kayo ng malubhang sakit dati?',
    surgery: 'Naoperahan na po ba kayo o na-confine sa ospital?',
    pregnancy: 'May posibilidad po bang buntis kayo ngayon?',
    breastfeeding: 'Nagpapasuso po ba kayo ngayon?',
    smoking: 'Naninigarilyo po ba kayo?',
    alcohol: 'Umiinom po ba kayo ng alak? Kung oo, mga ilang araw sa isang linggo, at ilang baso bawat inom?',
    travel: 'Sa nakaraang isang buwan, nanggaling po ba kayo sa ibang bansa o rehiyon maliban sa Japan?',
    heightWeight: 'Pakisabi po ang inyong tinatayang taas at timbang.',
    insurance: 'May health insurance po ba kayo?',
    firstVisit: 'Ito po ba ang unang beses ninyo sa ospital na ito?',
    interpreter: 'Kailangan po ba ninyo ng interpreter sa konsultasyon?',
  },
  pregnancyLead: 'Itinatanong po namin ito para ligtas na mapili ang gamot at mga pagsusuri.',
  onsetHeard: 'Mula kagabi',
  opt: {
    yes: 'Oo', no: 'Hindi', unknown: 'Hindi ko alam', noAnswer: 'Ayokong sabihin',
    correct: 'Oo, tama', fix: 'Hindi, itatama ko',
    sudden: 'Biglaan', gradual: 'Unti-unti',
    better: 'Gumagaan na', same: 'Ganoon pa rin', worse: 'Lumalala', waves: 'Pabalik-balik',
    nothingDone: 'Wala akong ginawa', dontRemember: 'Hindi ko maalala', noDrink: 'Hindi ako umiinom',
    smoker: 'Oo, naninigarilyo', exSmoker: 'Dati', nonSmoker: 'Hindi kailanman',
    jpInsurance: 'Health insurance sa Japan', travelInsurance: 'Travel insurance', noInsurance: 'Walang insurance',
    need: 'Oo, kailangan', noNeed: 'Hindi na kailangan', none: 'Wala',
  },
  illness: {
    hypertension: 'Altapresyon', diabetes: 'Diabetes', asthma: 'Hika', heart: 'Sakit sa puso',
    kidney: 'Sakit sa bato', liver: 'Sakit sa atay', cancer: 'Kanser', tb: 'TB', other: 'Iba pa',
  },
  height: 'Taas (cm)',
  weight: 'Timbang (kg)',
  next: 'Susunod',
  keys: {
    onsetConfirm: 'Kailan nagsimula', onsetMode: 'Paano nagsimula', course: 'Takbo mula nagsimula',
    selfCare: 'Mga ginawa na', fatigue: 'Lakas at gana', bloodThinner: 'Pampalabnaw ng dugo',
    allergyDetail: 'Reaksyon sa gamot', foodLatex: 'Allergy sa pagkain o latex', illness: 'Mga sakit',
    surgery: 'Operasyon o pagka-confine', pregnancy: 'Posibilidad ng pagbubuntis', breastfeeding: 'Pagpapasuso',
    smoking: 'Paninigarilyo', alcohol: 'Alak', travel: 'Biyahe sa nakaraang buwan', heightWeight: 'Taas at timbang',
    insurance: 'Health insurance', firstVisit: 'Unang punta rito', interpreter: 'Interpreter',
  },
  summary: 'Panghuli, binuod namin ang inyong mga sinabi. Pakitingnan kung tama ang lahat.',
  consent: 'Puwede po ba naming ipadala ito sa mga medical staff ng ospital?',
};

const id: FollowUpText = {
  intro: 'Terima kasih. Tinggal beberapa pertanyaan singkat lagi.',
  q: {
    onsetConfirm: 'Yang kami dengar: “sejak tadi malam”. Benar?',
    onsetMode: 'Apakah mulainya tiba-tiba, atau makin lama makin parah?',
    course: 'Dibandingkan saat mulai, bagaimana sekarang?',
    selfCare: 'Sebelum datang, apakah Anda sudah minum obat atau melakukan sesuatu untuk meredakannya?',
    fatigue: 'Bagaimana tenaga dan nafsu makan Anda?',
    bloodThinner: 'Apakah Anda minum obat pengencer darah (obat agar darah tidak mudah membeku)?',
    allergyDetail: 'Obat apa, dan apa yang terjadi? Tidak apa-apa kalau tidak tahu namanya.',
    foodLatex: 'Apakah Anda alergi terhadap makanan tertentu, atau lateks (sarung tangan karet)?',
    illness: 'Apakah Anda sedang berobat untuk suatu penyakit, atau pernah sakit berat sebelumnya?',
    surgery: 'Apakah Anda pernah dioperasi atau dirawat inap di rumah sakit?',
    pregnancy: 'Apakah ada kemungkinan Anda sedang hamil?',
    breastfeeding: 'Apakah Anda sedang menyusui?',
    smoking: 'Apakah Anda merokok?',
    alcohol: 'Apakah Anda minum alkohol? Jika ya, kira-kira berapa hari seminggu, dan berapa gelas setiap kali?',
    travel: 'Dalam satu bulan terakhir, apakah Anda pernah berada di negara atau wilayah selain Jepang?',
    heightWeight: 'Sebutkan perkiraan tinggi dan berat badan Anda.',
    insurance: 'Apakah Anda punya asuransi kesehatan?',
    firstVisit: 'Apakah ini pertama kali Anda datang ke rumah sakit ini?',
    interpreter: 'Apakah Anda perlu penerjemah saat pemeriksaan?',
  },
  pregnancyLead: 'Kami menanyakan ini agar obat dan pemeriksaan bisa dipilih dengan aman.',
  onsetHeard: 'Sejak tadi malam',
  opt: {
    yes: 'Ya', no: 'Tidak', unknown: 'Tidak tahu', noAnswer: 'Tidak ingin menjawab',
    correct: 'Ya, benar', fix: 'Tidak, saya mau koreksi',
    sudden: 'Tiba-tiba', gradual: 'Perlahan-lahan',
    better: 'Membaik', same: 'Sama saja', worse: 'Memburuk', waves: 'Kadang muncul kadang hilang',
    nothingDone: 'Belum melakukan apa-apa', dontRemember: 'Tidak ingat', noDrink: 'Tidak minum alkohol',
    smoker: 'Ya, merokok', exSmoker: 'Dulu merokok', nonSmoker: 'Tidak pernah',
    jpInsurance: 'Asuransi kesehatan Jepang', travelInsurance: 'Asuransi perjalanan', noInsurance: 'Tidak punya asuransi',
    need: 'Ya, perlu', noNeed: 'Tidak perlu', none: 'Tidak ada',
  },
  illness: {
    hypertension: 'Darah tinggi', diabetes: 'Diabetes', asthma: 'Asma', heart: 'Penyakit jantung',
    kidney: 'Penyakit ginjal', liver: 'Penyakit hati', cancer: 'Kanker', tb: 'TBC', other: 'Lainnya',
  },
  height: 'Tinggi (cm)',
  weight: 'Berat (kg)',
  next: 'Lanjut',
  keys: {
    onsetConfirm: 'Kapan mulai', onsetMode: 'Cara mulai', course: 'Perkembangan',
    selfCare: 'Yang sudah dicoba', fatigue: 'Tenaga dan nafsu makan', bloodThinner: 'Pengencer darah',
    allergyDetail: 'Reaksi obat', foodLatex: 'Alergi makanan atau lateks', illness: 'Riwayat penyakit',
    surgery: 'Operasi atau rawat inap', pregnancy: 'Kemungkinan hamil', breastfeeding: 'Menyusui',
    smoking: 'Merokok', alcohol: 'Alkohol', travel: 'Perjalanan sebulan terakhir', heightWeight: 'Tinggi dan berat badan',
    insurance: 'Asuransi kesehatan', firstVisit: 'Kunjungan pertama', interpreter: 'Penerjemah',
  },
  summary: 'Terakhir, kami merangkum apa yang Anda sampaikan. Silakan periksa apakah semuanya benar.',
  consent: 'Bolehkah kami mengirim ini ke staf medis rumah sakit?',
};

const mn: FollowUpText = {
  intro: 'Баярлалаа. Хэдэн богино асуулт үлдлээ.',
  q: {
    onsetConfirm: '“Өчигдөр оройноос” гэж ойлголоо. Зөв үү?',
    onsetMode: 'Гэнэт эхэлсэн үү, эсвэл аажмаар хүчтэй болсон уу?',
    course: 'Эхэлсэн үетэйгээ харьцуулахад одоо ямар байна вэ?',
    selfCare: 'Эмнэлэгт ирэхээсээ өмнө эм уусан эсвэл өөр ямар нэгэн арга хэрэглэсэн үү?',
    fatigue: 'Бие сульдах байдал, хоолны дуршил ямар байна вэ?',
    bloodThinner: 'Та цус шингэлэх эм (цус бүлэгнэхээс сэргийлэх эм) ууж байна уу?',
    allergyDetail: 'Ямар эм байсан, юу болсныг хэлнэ үү. Эмийн нэрийг мэдэхгүй байсан ч болно.',
    foodLatex: 'Та ямар нэгэн хоол хүнс эсвэл резинэн бээлий зэрэгт харшилдаг уу?',
    illness: 'Та одоо эмчлүүлж байгаа өвчин байна уу, эсвэл урьд нь хүнд өвчнөөр өвдөж байсан уу?',
    surgery: 'Та мэс засал хийлгэж эсвэл эмнэлэгт хэвтэж байсан уу?',
    pregnancy: 'Та одоо жирэмсэн байх магадлалтай юу?',
    breastfeeding: 'Та одоо хүүхдээ хөхүүлж байна уу?',
    smoking: 'Та тамхи татдаг уу?',
    alcohol: 'Та согтууруулах ундаа уудаг уу? Уудаг бол долоо хоногт хэдэн өдөр, нэг удаад хэдэн хундага уудаг вэ?',
    travel: 'Сүүлийн нэг сарын дотор Японоос өөр улс, бүс нутагт байсан уу?',
    heightWeight: 'Өндөр, жингээ ойролцоогоор хэлнэ үү.',
    insurance: 'Танд эрүүл мэндийн даатгал байгаа юу?',
    firstVisit: 'Та энэ эмнэлэгт анх удаа ирж байна уу?',
    interpreter: 'Үзлэгийн үеэр орчуулагч хэрэгтэй юу?',
  },
  pregnancyLead: 'Эм, шинжилгээг аюулгүй сонгохын тулд асууж байна.',
  onsetHeard: 'Өчигдөр оройноос',
  opt: {
    yes: 'Тийм', no: 'Үгүй', unknown: 'Мэдэхгүй', noAnswer: 'Хариулахыг хүсэхгүй',
    correct: 'Тийм, зөв', fix: 'Үгүй, засна',
    sudden: 'Гэнэт', gradual: 'Аажмаар',
    better: 'Сайжирч байна', same: 'Өөрчлөлтгүй', worse: 'Улам дордож байна', waves: 'Нэг сайжирч, нэг муудна',
    nothingDone: 'Юу ч хийгээгүй', dontRemember: 'Санахгүй байна', noDrink: 'Уудаггүй',
    smoker: 'Татдаг', exSmoker: 'Өмнө нь татдаг байсан', nonSmoker: 'Татдаггүй',
    jpInsurance: 'Японы эрүүл мэндийн даатгал', travelInsurance: 'Аяллын даатгал', noInsurance: 'Даатгалгүй',
    need: 'Хэрэгтэй', noNeed: 'Хэрэггүй', none: 'Байхгүй',
  },
  illness: {
    hypertension: 'Цусны даралт ихсэх', diabetes: 'Чихрийн шижин', asthma: 'Астма', heart: 'Зүрхний өвчин',
    kidney: 'Бөөрний өвчин', liver: 'Элэгний өвчин', cancer: 'Хорт хавдар', tb: 'Сүрьеэ', other: 'Бусад',
  },
  height: 'Өндөр (см)',
  weight: 'Жин (кг)',
  next: 'Дараах',
  keys: {
    onsetConfirm: 'Эхэлсэн хугацаа', onsetMode: 'Хэрхэн эхэлсэн', course: 'Явц',
    selfCare: 'Авсан арга хэмжээ', fatigue: 'Тэнхээ, хоолны дуршил', bloodThinner: 'Цус шингэлэх эм',
    allergyDetail: 'Эмийн урвал', foodLatex: 'Хоол хүнс, резиний харшил', illness: 'Өвчний түүх',
    surgery: 'Мэс засал, хэвтэн эмчлүүлсэн', pregnancy: 'Жирэмсэн байх магадлал', breastfeeding: 'Хөхүүл эсэх',
    smoking: 'Тамхи', alcohol: 'Согтууруулах ундаа', travel: 'Сүүлийн сарын аялал', heightWeight: 'Өндөр, жин',
    insurance: 'Эрүүл мэндийн даатгал', firstVisit: 'Анх удаа ирсэн эсэх', interpreter: 'Орчуулагч',
  },
  summary: 'Эцэст нь таны хэлсэн зүйлсийг нэгтгэлээ. Алдаа байгаа эсэхийг шалгана уу.',
  consent: 'Энэ мэдээллийг эмнэлгийн ажилтнуудад илгээж болох уу?',
};

const ja: FollowUpText = {
  intro: 'ありがとうございます。あといくつか、短い質問をさせてください。',
  q: {
    onsetConfirm: '「昨日の夜から」と聞き取りました。合っていますか？',
    onsetMode: '急に始まりましたか？それとも、だんだん強くなりましたか？',
    course: '始まったときと比べて、今はどうですか？',
    selfCare: '来院前に、薬を飲んだり、何か対処をしましたか？',
    fatigue: '体のだるさや、食欲はどうですか？',
    bloodThinner: '血をサラサラにする薬（血が固まりにくくなる薬）を飲んでいますか？',
    allergyDetail: 'その薬の名前と、どうなったか教えてください。名前がわからなくても大丈夫です。',
    foodLatex: '食べ物や、ゴム手袋などでアレルギーが出たことはありますか？',
    illness: '今治療中の病気や、これまでにかかった大きな病気はありますか？',
    surgery: '手術を受けたり、入院したことはありますか？',
    pregnancy: '今、妊娠している可能性はありますか？',
    breastfeeding: '今、授乳中ですか？',
    smoking: 'たばこは吸いますか？',
    alcohol: 'お酒は飲みますか？飲む場合、1週間に何日くらい、1回に何杯くらいですか？',
    travel: 'この1か月の間に、日本以外の国や地域にいましたか？',
    heightWeight: 'だいたいの身長と体重を教えてください。',
    insurance: '健康保険証はお持ちですか？',
    firstVisit: 'この病院に来るのは初めてですか？',
    interpreter: '診察のとき、通訳は必要ですか？',
  },
  pregnancyLead: '薬や検査を安全に選ぶために、確認させてください。',
  onsetHeard: '昨日の夜から',
  opt: {
    yes: 'はい', no: 'いいえ', unknown: 'わからない', noAnswer: '答えたくない',
    correct: '合っている', fix: '違うので直す',
    sudden: '急に', gradual: 'だんだん',
    better: '良くなっている', same: '変わらない', worse: '悪くなっている', waves: '波がある',
    nothingDone: '何もしていない', dontRemember: '覚えていない', noDrink: '飲まない',
    smoker: '吸う', exSmoker: '以前吸っていた', nonSmoker: '吸わない',
    jpInsurance: '日本の健康保険', travelInsurance: '旅行保険', noInsurance: '保険なし',
    need: '必要', noNeed: 'なくても大丈夫', none: 'なし',
  },
  illness: {
    hypertension: '高血圧', diabetes: '糖尿病', asthma: '喘息', heart: '心臓の病気',
    kidney: '腎臓の病気', liver: '肝臓の病気', cancer: 'がん', tb: '結核', other: 'その他',
  },
  height: '身長（cm）',
  weight: '体重（kg）',
  next: '次へ',
  keys: {
    onsetConfirm: 'いつから', onsetMode: '始まり方', course: '経過',
    selfCare: '自分でした対処', fatigue: 'だるさ・食欲', bloodThinner: '血をサラサラにする薬',
    allergyDetail: '薬で具合が悪くなったこと', foodLatex: '食べ物・ゴムのアレルギー', illness: '病気',
    surgery: '手術・入院', pregnancy: '妊娠の可能性', breastfeeding: '授乳',
    smoking: 'たばこ', alcohol: 'お酒', travel: 'この1か月の渡航', heightWeight: '身長・体重',
    insurance: '健康保険', firstVisit: '初めての受診か', interpreter: '通訳',
  },
  summary: '最後に、お伺いした内容をまとめました。間違いがないか確認してください。',
  consent: 'この内容を病院の医療スタッフに送ってもよいですか？',
};

export const FOLLOW_UP_TEXT: Record<LangId, FollowUpText> = { en, zh, vi, ko, pt, es, tl, id, mn, ja };

export interface VoiceAnswer { answer: string; understood: string; terms: TermMap[] }

/** 声で答える聞き足しのサンプル回答。interview.ts と同じく英語・中国語・ベトナム語（南部）だけ */
const VOICE_ANSWERS: Partial<Record<LangId, Record<VoiceId, VoiceAnswer>>> = {
  en: {
    selfCare: {
      answer: 'I took a couple of paracetamol last night, but it didn’t really touch it.',
      understood: 'Took 2 paracetamol tablets last night. Little effect.',
      terms: [{ from: 'didn’t really touch it', to: 'little effect' }],
    },
    fatigue: {
      answer: 'I’m absolutely wiped out, and I can’t face food.',
      understood: 'Marked tiredness. Poor appetite.',
      terms: [{ from: 'wiped out', to: 'fatigue' }, { from: 'can’t face food', to: 'loss of appetite' }],
    },
    allergyDetail: {
      answer: 'Penicillin. I came out in a rash all over when I was a kid.',
      understood: 'Penicillin: rash all over the body in childhood.',
      terms: [{ from: 'came out in a rash', to: 'skin rash' }],
    },
    alcohol: {
      answer: 'Just a glass or two of wine at the weekend.',
      understood: 'Alcohol: 1–2 glasses of wine at weekends.',
      terms: [],
    },
  },
  zh: {
    selfCare: {
      answer: '昨晚吃了两片扑热息痛，但没什么用。',
      understood: '昨晚服用对乙酰氨基酚 2 片，效果不明显。',
      terms: [{ from: '扑热息痛', to: '对乙酰氨基酚' }],
    },
    fatigue: {
      answer: '浑身没劲儿，什么都不想吃。',
      understood: '全身乏力，食欲不振。',
      terms: [{ from: '没劲儿', to: '乏力' }],
    },
    allergyDetail: {
      answer: '青霉素。小时候用过以后全身起疹子。',
      understood: '青霉素：儿童时期用药后全身皮疹。',
      terms: [{ from: '起疹子', to: '皮疹' }],
    },
    alcohol: {
      answer: '周末偶尔喝一两杯啤酒。',
      understood: '饮酒：周末偶尔，每次 1–2 杯啤酒。',
      terms: [],
    },
  },
  // 南部の話し言葉（hổng、nhậu など）
  vi: {
    selfCare: {
      answer: 'Tối qua tui uống hai viên Panadol mà hổng đỡ mấy.',
      understood: 'Tối qua uống 2 viên paracetamol (Panadol), không đỡ nhiều.',
      terms: [{ from: 'Panadol', to: 'paracetamol' }, { from: 'hổng', to: 'không' }],
    },
    fatigue: {
      answer: 'Người mệt rã rời, hổng muốn ăn gì hết.',
      understood: 'Mệt mỏi nhiều, chán ăn.',
      terms: [{ from: 'mệt rã rời', to: 'mệt mỏi nhiều' }, { from: 'hổng', to: 'không' }],
    },
    allergyDetail: {
      answer: 'Penicillin. Hồi nhỏ dùng xong nổi mẩn đỏ khắp người.',
      understood: 'Penicillin: hồi nhỏ dùng thuốc xong bị phát ban toàn thân.',
      terms: [{ from: 'nổi mẩn đỏ', to: 'phát ban' }],
    },
    alcohol: {
      answer: 'Cuối tuần nhậu chút xíu, chừng hai lon bia.',
      understood: 'Uống bia cuối tuần, khoảng 2 lon.',
      terms: [{ from: 'nhậu', to: 'uống rượu bia' }],
    },
  },
};

/** 声の回答のサンプル。無い言語は英語 */
export function getVoiceAnswer(lang: LangId, voiceId: VoiceId): VoiceAnswer {
  return (VOICE_ANSWERS[lang] ?? VOICE_ANSWERS.en!)[voiceId];
}

export function isVoiceId(id: FollowUpId): id is VoiceId {
  return id === 'selfCare' || id === 'fatigue' || id === 'allergyDetail' || id === 'alcohol';
}

/**
 * ボタン・数値で答えたものの表示文。声の回答は null（呼び出し側でサンプルを出す）。
 * forReview: 確認画面では、聞き取りの確認に「合っている」と答えたものを聞き取った内容で出す
 */
export function answerLabel(t: FollowUpText, id: FollowUpId, a: FollowUpAnswer, forReview = false): string | null {
  if (a === 'voice') return null;
  if (Array.isArray(a)) return a.map((x) => (x === 'none' ? t.opt.none : t.illness[x])).join(', ');
  if (typeof a === 'object') return `${a.h} cm / ${a.w} kg`;
  if (forReview && id === 'onsetConfirm' && a === 'correct') return t.onsetHeard;
  return t.opt[a];
}

/** サンプル症例の回答（患者画面で答えていないときに医療者画面で使う） */
export const SAMPLE_FOLLOW_UP_ANSWERS: FollowUpAnswers = {
  onsetConfirm: 'correct', onsetMode: 'sudden', course: 'worse', selfCare: 'voice', fatigue: 'voice',
  bloodThinner: 'no', allergyDetail: 'voice', foodLatex: 'no', illness: ['none'], surgery: 'no',
  pregnancy: 'no', breastfeeding: 'no', smoking: 'nonSmoker', alcohol: 'voice', travel: 'no',
  heightWeight: { h: '162', w: '55' }, insurance: 'jpInsurance', firstVisit: 'yes', interpreter: 'need',
};
