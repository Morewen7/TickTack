import React from 'react';
import {View} from 'react-native';

interface Props {
  size?: number;
  color?: string;
}

export function TTLogo({size = 80, color = '#ffffff'}: Props) {
  const s = Math.round(size * 0.18);   // толщина
  const tw = Math.round(size * 0.55);  // нормальная ширина буквы
  // Правая T сдвинута влево так, чтобы стойки были рядом
  const stem1x = Math.round((tw - s) / 2);  // стойка левой T
  const t2start = stem1x + s;               // правая T начинается сразу после стойки левой
  const stem2x = t2start + Math.round((tw - s) / 2); // стойка правой T

  return (
    <View style={{width: t2start + tw, height: size}}>
      {/* Левая T */}
      <View style={{position:'absolute', top:0, left:0, width:tw, height:s, backgroundColor:color}} />
      <View style={{position:'absolute', top:0, left:stem1x, width:s, height:size, backgroundColor:color}} />

      {/* Правая перевёрнутая T */}
      <View style={{position:'absolute', bottom:0, left:t2start, width:tw, height:s, backgroundColor:color}} />
      <View style={{position:'absolute', top:0, left:stem2x, width:s, height:size, backgroundColor:color}} />
    </View>
  );
}
