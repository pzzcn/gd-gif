"use strict"
const fonts=require("./lib/Fonts");
const bufferV2=require("./lib/BufferV2");
const LZWEncoder=require("./lib/LZWEncoder");


class GIF{
    constructor(width,height){
        this.width=width;
        this.height=height;
        this.color=["FFFFFF","0055FF","0066CC","FF2100","00A23D","D1CA00","386D00","027C6C","02477C","69027C"];
        this.background="FFFFFF";
        this.transparentColor=false;
        this.fonts=new fonts();
        this.canvas=[];
        this.canvasFrames=[];
        this._recordRect(true);
    }
    selectFrames(i){
        this.canvas=this.canvasFrames[i].canvas;
    }
    addFrames(time){
        let cav=[];
        for(let r=0;r<this.height;r++){
            let str=[];
            for(let i=0;i<this.width;i++){
                str.push(this.getColorIndex(this.background));
            }
            cav[r]=str;
        }
        if(typeof time!="number"){
            time=0;
        }
        this.canvasFrames.push({"time":time,"canvas":cav});
        this.selectFrames(this.canvasFrames.length-1);
    }
    setBackground(color){
        color=color.toUpperCase();
        this.pushColor(color);
        this.background=color;
    }
    setTransparentColor(color){
        //设置将颜色索引表中的某个颜色作为透明颜色
        color=color.toUpperCase();
        this.pushColor(color);
        this.transparentColor=color;
    }
    pushColor(color){
        color=color.toUpperCase();
        for(let i=0;i<this.color.length;i++){
            if(this.color[i]==color){
                return this;
            }
        }
        this.color.push(color);
        return this;
    }
    getColorIndex(color,g,b){
        if(typeof color=="number" && typeof g=="number" && typeof b=="number"){
            color=this.lpad(color.toString(16),"0",2)+this.lpad(g.toString(16),"0",2)+this.lpad(b.toString(16),"0",2);
        }
        if(typeof color=="string" && color.length!=6){
            color=this.lpad(color,"0",6);
        }
        color=color.toUpperCase();
        this.pushColor(color);
        for(let i=0;i<this.color.length;i++){
            if(this.color[i]==color){
                return this.lpad(i.toString(16),"0",2).toUpperCase();
            }
        }
    }
    getColor(index){
        return this.color[parseInt(index,"16")];
    }
    lpad(s,p,l){
        s=s.toString();
        if(s.length<l){
            let c=l-s.length;
            for(let i=0;i<c;i++){
                s=p+s;
            }
        }
        return s;
    }

    drawText(text,x,y,color,aa){
        let font=this.fonts["get_"+text]();
        let w=font[0].length;
        let h=font.length;

        let index=0;
        let c="";

        this._recordRect(true);
        for(let i=y;i<h+y;i++){
            c=font[index];
            for(let r=0;r<c.length;r++){
                if(c[r]=="1"){
                    this.drawPoint(x+r,i,color);
                    //this.canvas[i].splice(x+r,1,c[r]);
                }
            }

            index++;
        }
        if(typeof aa=="boolean" && aa==true){
            this.antiAliasation(this._rect.x,this._rect.y,this._rect.x1,this._rect.y1,color);
        }

        return this;
    }

    getCanvas(){
        return this.canvas;
    }

    getCanvasMatrix(str,mstr){
        let arr=[];
        for(let i=0;i<this.canvas.length;i++){
            arr.push(this.canvas[i].join(mstr?mstr:""));
        }
        return arr.join(str?str:"\r");
    }

    Dword(n){
        let s = n.toString("16");
        const st="0000";
        s=st.substr(0,4-s.length)+s;
        s=s.substr(2,2)+s.substr(0,2)
        return s;
    }

    getGlobalColorTable(sl){
        if(typeof sl=="object" && typeof sl.length=="number"){
            sl=sl.length;
        }
        if(sl>0 && sl<=2){
            return 0;
        }else if(sl>2 && sl<=4){
            return 1;
        }else if(sl>4 && sl<=8){
            return 2;
        }else if(sl>8 && sl<=16){
            return 3;
        }else if(sl>16 && sl<=32){
            return 4;
        }else if(sl>32 && sl<=64){
            return 5;
        }else if(sl>64 && sl<=128){
            return 6;
        }else if(sl>128 && sl<=256){
            return 7;
        }
    }
    drawPoint(x,y,color){
        color=this.getColorIndex(color);
        x=this.ipart(x);
        y=this.ipart(y);
        if(typeof this.canvas[y]=="undefined" || typeof this.canvas[y][x]=="undefined"){
            return ;
        }
        this.canvas[y][x]=color;
        this._rect.x=Math.min(this._rect.x,x);
        this._rect.x1=Math.max(this._rect.x1,x);
        this._rect.y=Math.min(this._rect.y,y);
        this._rect.y1=Math.max(this._rect.y1,y);
    }


    drawRect(x, y, width,height, angle,color,aa) {
        let hw = width*0.5;
        let hh = height*0.5;
        x+=hw;
        y+=hh;
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        let x0 = cos * -hw - sin * -hh;
        let y0 = sin * -hw + cos * -hh;
        let x1 = cos * hw - sin * -hh;
        let y1 = sin * hw + cos * -hh;
        let x2 = cos * hw - sin * hh;
        let y2 = sin * hw + cos * hh;
        let x3 = cos * -hw - sin * hh;
        let y3 = sin * -hw + cos * hh;
        //this.x=this.x+hw;
        //this.y=this.y+hh;
        this._recordRect(true);
        this.drawLine(x + x0, y + y0, x + x1, y + y1, color,false);
        this.drawLine(x + x1, y + y1, x + x2, y + y2, color,false);
        this.drawLine(x + x2, y + y2, x + x3, y + y3, color,false);
        this.drawLine(x + x3, y + y3, x + x0, y + y0, color,false);

        if(typeof aa=="boolean" && aa==false){
            return ;
        }
        this.antiAliasation(this._rect.x,this._rect.y,this._rect.x1,this._rect.y1,color);
        return this;
         //this.drawWuLine(x, y, 100,30, color,false);
        // this.drawLine(x1, y1, x1,y2, color);
        // this.drawLine(x2, y1, x2,y2, color);
        // this.drawLine(x1, y2, x2,y2, color);
    }

    /*
    * x:起始位置x
    * y:结束位置y
    * x1:结束位置x
    * y1:结束位置y
    * pl:频率 数值越小频率越高
    * fd:幅度 数值越小幅度越大
    * bx:线宽
    * color:颜色
    * aa:是否启动抗锯齿
    * */
    drawCurve(x,y,x1,y1,pl,fd,bx,color,aa){
        let w=this.width/2;
        let h=y1-y;
        //let color = color;
        let y2=y; //Y轴位置调整
        y2-=5;
        //let w2=5; //数值越小频率越高
        //let h3=3; //数值越小幅度越大
        let w2=pl;
        let h3=fd;
        let bl = bx;//线宽
        this._recordRect(true);
        for(var i=-w; i<w; i+=0.1) {
            var y3 = Math.floor(h / h3 * Math.sin(i / w2) + h / 2 + y2);
            var x3 = Math.floor(i + w)+x;
            for (var j = 0; j < bl; j++) {
                if(x3>x1){
                    continue;
                }
                if((y3+j)>y1){
                    continue;
                }
                this.drawPoint(x3, y3 + j, color);
            }
        }


        if(typeof aa=="boolean" && aa==true){
            this.antiAliasation(this._rect.x,this._rect.y,this._rect.x1,this._rect.y1,color);
        }
        return this;
    }


    fillRect(x1, y1, x2, y2, color) {
        x1--;y1--;x2--;y2--;
        let x;
        if (x1 > x2) {
            let tmp = x2;
            x2 = x1;
            x1 = tmp;
        }
        if (y1 > y2) {
            let tmp = y2;
            y2 = y1;
            y1 = tmp;
        }
        for (; y1 <= y2; y1++) {
            for (x = x1; x <= x2; x++) {
                this.drawPoint(x, y1, color);
            }
        }
    }
    getOuter() {
        //获取区域内图形的外边界
        let cv=this.canvas;
        for(let i=0;i<cv.length;i++){
            for(let r=0;r<cv[i].length;r++){
                ta.push(this.lpad(cv[i][r]," ",2))
                cv[r][i]=cv[r][i]=="00"?0:1;
            }
        }

        /*
        * 循环找到第一个1，然后找下一个0
        * */
        let start=false;
        for(let i=0;i<cv.length;i++){
            for(let j=0;j<cv[i].length;j++){
                if(cv[i][j]==1){
                    //循环到第一个
                    start={"x":j,"y":i};
                    break;
                }
            }
            if(start){
                break;
            }
        }
        //从起始点开始找，顺时针找到第一个1，如果没有则结束
        let act=true;
        let arr=[];
        let mp={};
        mp[start.x+"_"+start.y]=1;
        arr.push(start);
        /*
        *
        * [1][2][3]
        * [4][5][6]
        * [7][8][9]
        *
        * 将一个点作为5，从1点顺时针查找第一个像素点
        *
        * 修改点位方便循环
        * [0][1][2]
        * [7][8][3]
        * [6][5][4]
        * */
        let s=[{},{},{},{},{},{},{},{}];
        let si={};
        let add=false;
        let startI=0;
        let oldStart={"x":0,"y":0}
        while(act){
            add=false;
            s[0].x=start.x-1;
            s[0].y=start.y-1;
            s[1].x=start.x;
            s[1].y=start.y-1;
            s[2].x=start.x+1;
            s[2].y=start.y-1;
            s[3].x=start.x+1;
            s[3].y=start.y;
            s[4].x=start.x+1;
            s[4].y=start.y+1;
            s[5].x=start.x;
            s[5].y=start.y+1;
            s[6].x=start.x-1;
            s[6].y=start.y+1;
            s[7].x=start.x-1;
            s[7].y=start.y;
            si=-1;
            if(oldStart.x>0  && oldStart.y>0){
                for(let i=0;i<8;i++){
                    if(s[i].x==oldStart.x && s[i].y==oldStart.y){
                        startI=i;
                        break;
                    }
                }
            }
            if(startI>=7){
                startI=0;
            }

            for(let i=startI;i<8;i++){
                if(cv[s[i].y][s[i].x]==0){//先找到第一个外围0
                    si=i;
                    break;
                }
            }
            oldStart.x=start.x;
            oldStart.y=start.y;
            //先顺时针找，如果找到的1已经存在，则逆时针在找一次
            let inverse=false;
            let ii=si;
            for(let i=0;i<8;i++){
                if(cv[s[ii].y][s[ii].x]===1){
                    if(mp[s[ii].x+"_"+s[ii].y]){
                        inverse=true;
                        break;
                    }else{
                        mp[s[ii].x+"_"+s[ii].y]=1;
                        arr.push({"x":s[ii].x,"y":s[ii].y});
                        start={"x":s[ii].x,"y":s[ii].y};
                        add=true;
                        break;
                    }
                }
                ii++;
                if(ii>7){
                    ii=0;
                }
            }
            /*
            if(inverse){
                for(let i=si;i>=0;i--){
                    if(cv[s[i].y][s[i].x]===1){
                        if(mp[s[i].x+"_"+s[i].y]){
                            break;
                        }else{
                            mp[s[i].x+"_"+s[i].y]=1;
                            arr.push({"x":s[i].x,"y":s[i].y});
                            start={"x":s[i].x,"y":s[i].y};
                            add=true;
                            break;
                        }
                    }
                }
            }
            */


            if(!add){
                act=false;
            }
        }

        //console.log(arr);
    }

    _recordRect(act){
        if(act){
            this._rect={x:99999999,y:9999999,x1:0,y1:0};
        }
    }

    _color2rgb(color){
        if(color.length==2){
            color=this.getColor(color);
        }
        let r=color.substr(0,2);
        let g=color.substr(2,2);
        let b=color.substr(4,2);
        r=parseInt(r,16);
        g=parseInt(g,16);
        b=parseInt(b,16);
        return {r:r,g:g,b:b};
    }

    drawCircle(x, y, r, color,aa) {
        let a, b, c; // tslint:disable-line
        a = 0;
        b = r;
        //   c = 1.25 - r;
        c = 3 - 2 * r;
        this._recordRect(true);
        while (a < b) {
            this.drawPoint(x + a, y + b, color);
            this.drawPoint(x - a, y + b, color);
            this.drawPoint(x + a, y - b, color);
            this.drawPoint(x - a, y - b, color);
            this.drawPoint(x + b, y + a, color);
            this.drawPoint(x - b, y + a, color);
            this.drawPoint(x + b, y - a, color);
            this.drawPoint(x - b, y - a, color);

            if (c < 0) {
                c = c + 4 * a + 6;
            }
            else {
                c = c + 4 * (a - b) + 10;
                b -= 1;
            }
            a = a + 1; // 控制打点间隔
        }
        if (a === b) {
            this.drawPoint(x + a, y + b, color);
            this.drawPoint(x - a, y + b, color);
            this.drawPoint(x + a, y - b, color);
            this.drawPoint(x - a, y + b, color);
            this.drawPoint(x + b, y + a, color);
            this.drawPoint(x - b, y + a, color);
            this.drawPoint(x + b, y - a, color);
            this.drawPoint(x - b, y - a, color);
        }

        if(typeof aa=="boolean" && aa==false){
            return ;
        }
        this.antiAliasation(this._rect.x,this._rect.y,this._rect.x1,this._rect.y1,color);
    }

    antiAliasation(x,y,x1,y1,color){
        let ci=this.getColorIndex(color);//获取颜色索引
        let factor=0.3;
        let rgb="";
        let r=0;
        let g=0;
        let b=0;
        for(let i=x;i<=x1;i++){
            for(let r=y;r<=y1;r++){
                if(this.canvas[r][i]==ci){
                    continue;
                }
                if(i>0 && r>0){
                    if((this.canvas[r-1][i]==ci) && (this.canvas[r][i-1]==ci)){
                        /*rgb=this._color2rgb(this.canvas[r][i]);
                        rgb.r=this.ipart(rgb.r*factor);
                        rgb.g=this.ipart(rgb.g*factor);
                        rgb.b=this.ipart(rgb.b*factor);
                        this.canvas[r][i]=this.getColorIndex(rgb.r,rgb.g,rgb.b);*/
                        this.plot(i,r,factor,color);
                    }
                }

                if(i<x1-1 && r<y1-1){
                    if((this.canvas[r+1][i]==ci) && (this.canvas[r][i+1]==ci)){
                        /*rgb=this._color2rgb(this.canvas[r][i]);
                        rgb.r=this.ipart(rgb.r*factor);
                        rgb.g=this.ipart(rgb.g*factor);
                        rgb.b=this.ipart(rgb.b*factor);
                        this.canvas[r][i]=this.getColorIndex(rgb.r,rgb.g,rgb.b);*/
                        this.plot(i,r,factor,color);
                    }
                }

                if(r>0 && i<x1-1){
                    if((this.canvas[r-1][i]==ci) && (this.canvas[r][i+1]==ci)){
                        /*rgb=this._color2rgb(this.canvas[r][i]);
                        rgb.r=this.ipart(rgb.r*factor);
                        rgb.g=this.ipart(rgb.g*factor);
                        rgb.b=this.ipart(rgb.b*factor);
                        this.canvas[r][i]=this.getColorIndex(rgb.r,rgb.g,rgb.b);*/
                        this.plot(i,r,factor,color);
                    }
                }

                if(i>0 && r<y1-1){
                    if((this.canvas[r+1][i]==ci) && (this.canvas[r][i-1]==ci)){
                        /*rgb=this._color2rgb(this.canvas[r][i]);
                        rgb.r=this.ipart(rgb.r*factor);
                        rgb.g=this.ipart(rgb.g*factor);
                        rgb.b=this.ipart(rgb.b*factor);
                        this.canvas[r][i]=this.getColorIndex(rgb.r,rgb.g,rgb.b);*/
                        this.plot(i,r,factor,color);
                    }
                }
            }
        }
    }

    drawLine(x1,y1,x2,y2,color,aa){
        if(typeof aa=="boolean" && aa==true){
            return this.drawWuLine(x1,y1, x2, y2, color);
        }
        x1--;
        y1--;
        x2--;
        y2--;
        let x, y, dx, dy, s1, s2, p, temp, interchange, i; //tslint:disable-line
        x = x1;
        y = y1;
        dx = x2 > x1 ? (x2 - x1) : (x1 - x2);
        dy = y2 > y1 ? (y2 - y1) : (y1 - y2);
        s1 = x2 > x1 ? 1 : -1;
        s2 = y2 > y1 ? 1 : -1;
        if (dy > dx) {
            temp = dx;
            dx = dy;
            dy = temp;
            interchange = true;
        }
        else {
            interchange = false;
        }
        p = (dy << 1) - dx;
        for (i = 0; i <= dx; i++) {
            this.drawPoint(x, y, color);
            if (p >= 0) {
                if (interchange) {
                    x = x + s1;
                }
                else {
                    y = y + s2;
                }
                p = p - (dx << 1);
            }
            if (interchange) {
                y = y + s2;
            }
            else {
                x = x + s1;
            }
            p = p + (dy << 1);
        }
    }
    drawWuLine(x0, y0, x1, y1, color) {
        let steep=Math.abs(y1-y0)>Math.abs(x1-x0);

        let t=0;
        if (steep) {
            t = y0; y0 = x0; x0 = t;
            t = y1; y1 = x1; x1 = t;
        }

        if (x0 > x1) {
            t = x0; x0 = x1; x1 = t;
            t = y0; y0 = y1; y1 = t;
        }

        let dx = x1 - x0;
        let dy = y1 - y0;
        let gradient = dy / dx;

        // handle first endpoint
        let xend0 = this.round(x0);
        let yend0 = y0 + gradient * (xend0 - x0);
        this.wupixel(steep, xend0, yend0, this.rfpart(x0 + 0.5), color);

         // handle second endpoint
         let xend1 = this.round(x1);
         let yend1 = y1 + gradient * (xend1 - x1);
         this.wupixel(steep, xend1, yend1, this.fpart(x1 + 0.5), color);

        // main loop
        let intery = yend0 + gradient;
        for (let x = xend0 + 1; x <= xend1 - 1; ++x) {
            //console.log(steep, x, intery, 1.0, color);
            this.wupixel(steep, x, intery, 1.0, color);
            intery += gradient;
        }
    }

    wupixel(steep, x, intery, gap, color){
        //console.log("--"+steep, x, intery, gap, color)
        if (steep) {
            this.plot(this.ipart(intery) + 0, x, this.rfpart(intery) * gap, color);
            this.plot(this.ipart(intery) + 1, x, this.fpart(intery) * gap, color);
        } else {
            this.plot(x, this.ipart(intery) + 0, this.rfpart(intery) * gap, color);
            this.plot(x, this.ipart(intery) + 1, this.fpart(intery) * gap, color);
        }
    }

    plot(x, y, c,color) {
        //console.log("++"+x, y, c,color)
        if(typeof this.canvas[y]=="undefined" || typeof this.canvas[y][x]=="undefined"){
            return ;
        }
        let c256 =(256.0 * c);
        let offset = x + y;
        let pixel = this.canvas[y][x];
        pixel=parseInt(this.getColor(pixel),16);
        this.canvas[y][x]="";
        let color_int=parseInt(color,"16");
        let _FF00FF=parseInt("FF00FF","16");
        let _00FF00=parseInt("00FF00","16");
        /*this.canvas[y][x] = ((_FF00FF & color_int) * c256 + (_FF00FF & pixel) * (256 - c256) >> 8 & _FF00FF) |
            ((_00FF00 & color_int) * c256 + (_00FF00 & pixel) * (256 - c256) >> 8 & _00FF00);
        this.canvas[y][x]=this.canvas[y][x].toString("16");
        this.canvas[y][x]=this.getColorIndex(this.canvas[y][x]);*/

        let co=((_FF00FF & color_int) * c256 + (_FF00FF & pixel) * (256 - c256) >> 8 & _FF00FF) |
            ((_00FF00 & color_int) * c256 + (_00FF00 & pixel) * (256 - c256) >> 8 & _00FF00);
        co=co.toString(16);
        //this.canvas[y][x]=this.getColorIndex(co);
        this.drawPoint(x,y,co);
    }
    ipart(x) {
        return parseInt(x,10);
    }
    rfpart(x) {
        return 1.0 - this.fpart(x);
    }

    fpart(x) {
        return x < 0.0 ? this.ipart(x) - x : x - this.ipart(x);
    }
    round(x) {
        return this.ipart(x + 0.5);
    }



    getImage(){

        let b=new bufferV2(512);//512为初始自己数，系统会自动扩展
        b.appendStr("GIF89a");//文件类型
        b.appendHexStr(this.Dword(this.width));//逻辑屏幕宽度
        b.appendHexStr(this.Dword(this.height));//逻辑屏幕高度
        /*
       1    Global Color Table Flag为全局颜色表标志，即为1时表明全局颜色表有定义。
       111  Color Resolution 代表颜色表中每种基色位长（需要+1），为111时，每个颜色用8bit表示，即我们熟悉的RGB表示法，一个颜色三字节。
       0    Sort Flag 表示是否对颜色表里的颜色进行优先度排序，把常用的排在前面，这个主要是为了适应一些颜色解析度低的早期渲染器，现在已经很少使用了。
       111  Global Color Table 表示颜色表的长度，计算规则是值+1作为2的幂，得到的数字就是颜色表的项数，取最大值111时，项数=256，也就是说GIF格式最多支持256色的位图，再乘以Color Resolution算出的字节数，就是调色盘的总长度。
       000  0  2^(0+1)=2
       001  1 2^(1+1)=4
       010  2 2^(2+1)=8
       011  3 2^(3+1)=16
       100  4 2^(4+1)=32
       101  5 2^(5+1)=64
       110  6 2^(6+1)=128
       111  7 2^(7+1)=256

       1 111 0 111
       */

        let colorSize=this.getGlobalColorTable(this.color);
        b.appendBit("11110"+this.lpad(colorSize.toString(2),"0",3));

        b.appendHexStr(this.getColorIndex(this.background));//为背景颜色(在全局颜色列表中的索引
        b.appendInt(0);//像素宽高比

        //全局颜色列表 添加
        let tmpColor=[];
        for(let i=0;i<Math.pow(2,(colorSize+1));i++){
            if(typeof this.color[i]=="string"){
                tmpColor.push(this.color[i]);
            }else{
                tmpColor.push("000000");
            }
        }

        b.appendHexStr(tmpColor.join(""));
        b.appendHexStr("21FF0B");
        b.appendStr("NETSCAPE2.0");
        b.appendHexStr("0301000000");

        for(let i=0;i<this.canvasFrames.length;i++){
            let cav=this.canvasFrames[i].canvas;
            b.appendHexStr("21F904");
            /*
            disposal method
            disposal method占3Bit，能够表示0-7。
            disposal method = 1
            解码器不会清理画布，直接将下一幅图像渲染上一幅图像上。
            disposal method = 2
            解码器会以背景色清理画布，然后渲染下一幅图像。背景色在逻辑屏幕描述符中设置。
            disposal method = 3
            解码器会将画布设置为上之前的状态，然后渲染下一幅图像。
            disposal method = 4-7
            保留值
             */
            let disposal_method=1;
            //如果图形控制扩展的透明色标志位为1，那么解码器会通过透明色索引在颜色列表中找到改颜色，标记为透明，当渲染图像时，标记为透明色的颜色将不会绘制，显示下面的背景。
            let transparency_color=0;
            if(this.transparentColor){
                transparency_color=1;
            }
            b.appendBit("000"+this.lpad(disposal_method.toString(2),"0",3)+"0"+transparency_color);
            b.appendHexStr(this.Dword(this.canvasFrames[i].time));//延时时间，单位是0.01秒
            if(this.transparentColor){//设置透明颜色
                b.appendHexStr(this.getColorIndex(this.transparentColor));
            }else{
                b.appendHexStr("00");
            }
            b.appendHexStr("00")


            b.appendStr(",");//gif内一张图片的开始
            b.appendHexStr("0000");//X方向偏移量
            b.appendHexStr("0000");//Y方向偏移量

            b.appendHexStr(this.Dword(this.width));//屏幕宽度
            b.appendHexStr(this.Dword(this.height));//屏幕高度
            b.appendHexStr("00");//局部颜色列表标志，因无局部颜色列表，此部分内容不解释
            //b.appendHexStr("07"); //code size

            /*for(let i=0;i<rows.length;i++){
                b.appendHexStr(rows[i]);
            }*/


            let out=new bufferV2(512);
            let carr=[];
            for(let i=0;i<cav.length;i++){
                carr.push(cav[i].join(""))
            }

            for(let i=0;i<carr.length;i++){
                out.appendHexStr(carr[i]);
            }
            let enc = new LZWEncoder(this.width, this.height,out.getBuffer(), colorSize+1);
            out=enc.encode();

            b.appendBuffer(out.getBuffer());
        }


        //b.appendHexStr("80008100");
        b.appendHexStr("3B");

        let img=b.getBuffer();

        return img;
    }
    rand(min, max) {
        return Math.random()*(max-min+1) + min | 0; //特殊的技巧，|0可以强制转换为整数
    }
    setVerificationCode(code,InterferenceLine){
        /*宽度14 高度19*/
        let pfw=this.width/code.length;
        let randW=pfw-13;
        let randH=this.height-20;

        let tw=0;
        let th=0;
        let tc=0;

        for(let i=0;i<code.length;i++){
            tw=this.rand(0,randW)+(i*pfw);
            th=this.rand(0,randH);
            tw=i*pfw;
            tc=this.rand(1,this.color.length-1);
            //复制一份颜色列表，但去除tc

            this.addFrames(40);
            this.drawText(code.charAt(i),tw,th,this.color[tc]);
            if(InterferenceLine){
                let arr=[];
                for(let i=1;i<this.color.length;i++){
                    if(this.color[i]!=this.color[tc]){
                        arr.push(this.color[i]);
                    }
                }
                let tcc=this.rand(0,arr.length-1);
                this.drawLine(this.rand(-10,50),this.rand(0,60),this.rand(80,160),this.rand(0,60),arr[tcc],false);
                this.drawLine(this.rand(-10,50),this.rand(0,60),this.rand(80,160),this.rand(0,60),arr[tcc],false);
                this.drawLine(this.rand(-10,50),this.rand(0,60),this.rand(80,160),this.rand(0,60),arr[tcc],false);
            }

        }

    }

}

module.exports = GIF;