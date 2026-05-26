const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'rental.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS houses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    layout TEXT NOT NULL,
    area REAL NOT NULL,
    address TEXT NOT NULL,
    image TEXT DEFAULT '',
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    house_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT DEFAULT '',
    preferred_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (house_id) REFERENCES houses(id)
  );
`);

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  }

  const houseCount = db.prepare('SELECT COUNT(*) AS c FROM houses').get().c;
  if (houseCount === 0) {
    const houses = [
      ['阳光花园 2室1厅 精装修', '南北通透，采光充足，家电齐全，拎包入住。小区环境优美，绿化率高，周边配套完善。', 3200, '2室1厅', 78, '北京市朝阳区阳光花园小区3号楼502', '', '张经理', '13800001111'],
      ['翠湖雅居 3室2厅 拎包入住', '湖景房，视野开阔，精装修三居室，适合一家人居住。地铁口300米，出行便利。', 5600, '3室2厅', 120, '北京市海淀区翠湖雅居7栋301', '', '李经理', '13900002222'],
      ['温馨小窝 1室1厅 近地铁', '精装一居室，离地铁站步行5分钟，适合年轻人居住。楼层好，安静不吵闹。', 2100, '1室1厅', 45, '北京市丰台区温馨家园2号楼801', '', '王经理', '13700003333'],
      ['学府公寓 2室1厅 靠近大学', '位于大学城核心区域，周边生活便利，适合考研学生或年轻白领合租。双阳台设计。', 2800, '2室1厅', 72, '北京市昌平区学府公寓A座603', '', '赵经理', '13600004444'],
      ['豪华大平层 4室2厅 高端社区', '高端社区大平层，全屋智能家居，中央空调，地暖，新风系统一应俱全。车位充足。', 12000, '4室2厅', 200, '北京市朝阳区望京SOHO旁', '', '孙经理', '13500005555'],
      ['老城新居 1室0厅 经济实惠', '市中心位置，交通便利，周边菜市场超市齐全。适合预算有限的租客。', 1500, '1室0厅', 30, '北京市东城区老城新居B座1201', '', '钱经理', '13400006666'],
      ['科技园 3室1厅 合租优选', '紧邻科技园区，周边互联网公司云集。三居室合租，公共区域定期清洁。', 4200, '3室1厅', 95, '北京市海淀区科技园路88号', '', '周经理', '13300007777'],
      ['滨江公寓 2室2厅 江景房', '一线江景，超大落地窗，精装交付。楼下就是商业街，生活购物非常方便。', 4800, '2室2厅', 105, '上海市浦东新区滨江大道99号', '', '吴经理', '13200008888'],
      ['花园洋房 3室2厅 带院子', '一楼带私家花园，适合养花养宠物。精装修，配有全套家具家电。社区安静安全。', 6500, '3室2厅', 130, '杭州市西湖区花园洋房12栋', '', '郑经理', '13100009999'],
      ['青年公寓 开间 紧邻商圈', '新建公寓，全新装修，紧邻大型商圈，吃喝玩乐一步到位。月租含物业费。', 1800, '开间', 35, '深圳市南山区科技园南路66号', '', '冯经理', '13000001010'],
    ];
    const stmt = db.prepare(
      'INSERT INTO houses (title, description, price, layout, area, address, image, contact_name, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const h of houses) stmt.run(...h);
  }
}

seed();

module.exports = db;
