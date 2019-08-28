class BufferV2{
    constructor(length){
        this.length=length||512;
        this.buf=Buffer.alloc(length);
        this.bufArr=[];
        this.index=0;
    }
    appendHexStr(hexStr){
        if(this.index==this.length){//如果字节索引等于限制长度，则创建新的buf对象
            this.index=0;
            //console.log(this.buf);
            this.bufArr.push(this.buf);
            this.buf=Buffer.alloc(this.length);
        }

        const l=hexStr.length/2;
        const c=this.length-this.index;
        if(l<=c){//要添加的长度小于字节剩余的长度
            this.buf.write(hexStr,this.index,l,"hex");
            this.index=this.index+l;
        }else{
            this.appendHexStr(hexStr.substr(0,c*2));
            hexStr=hexStr.substr(c*2);
            let tmp=[];
            let tstr="";
            let act=true;
            let r=0;
            while(act){
                tstr=hexStr.substr(r*this.length*2,this.length*2);
                if(tstr==""){
                    act=false;
                }else{
                    this.appendHexStr(tstr);
                }
                r++;
            }
        }
        return this;
    }
    appendByte(b){
        this.appendInt(b);
    }
    appendBytes(array, offset, length){
        let l = length || array.length
        for (let i = offset || 0; i < l; i++){
            this.appendByte(array[i]);
        }

    }
    appendBuffer(b){
        for(let i=0;i<b.length;i++){
            this.appendInt(b[i]);
        }
    }
    appendInt(n){
        //this.buf.writeInt16LE(n,this.index,1);
        //this.index++;
        return this.appendHexStr(this.lpad(n.toString(16),"0",2));
    }
    appendStr(str){
        //this.buf.write(str,this.index,str.length,"ascii");
        //this.index=this.index+str.length;
        let arr=[];
        for(let i=0;i<str.length;i++){
            arr.push(this.lpad(str.charAt(i).charCodeAt().toString(16),"0",2));
        }
        return this.appendHexStr(arr.join(""));
    }
    appendBit(bit){
        if(typeof bit=="string"){
            bit=Number(bit);
        }
        bit=parseInt(bit,2);
        //this.buf.writeInt16LE(bit,this.index,1);
        this.appendInt(bit);
        return this;
    }
    clear(){
        this.buf=null;
        this.buf=Buffer.alloc(this.length);
        return this;
    }
    getBuffer(){
        let sl= this.bufArr.length*this.length;
        if(this.index>0){
            let tmpb=Buffer.alloc(this.index);
            for(let i=0;i<this.index;i++){
                tmpb[i]=this.buf[i];
            }
            this.bufArr.push(tmpb);
        }
        return Buffer.concat(this.bufArr, sl+this.index);
    }

    lpad(s,p,l){
        s=s.toString();
        if(s.length<l){
            for(let i=0;i<l-s.length;i++){
                s=p+s;
            }
        }
        return s;
    }
}
module.exports=BufferV2;